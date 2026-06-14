import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticationError } from '../errors';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const { email, password, username, role } = req.body as {
      email: string;
      password: string;
      username: string;
      role?: string;
    };
    const user = await this.authService.register({ email, password, username, role });
    res.status(201).json(user);
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };
    const result = await this.authService.login(email, password);
    const { refreshToken, ...rest } = result;
    const maxAge = Number(process.env.JWT_REFRESH_EXPIRES_IN) * 1000;
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
    });
    res.status(200).json(rest);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token');
    }
    const result = await this.authService.refresh(refreshToken);
    const { refreshToken: newRefreshToken, ...rest } = result;
    const maxAge = Number(process.env.JWT_REFRESH_EXPIRES_IN) * 1000;
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
    });
    res.status(200).json(rest);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (refreshToken) {
      try {
        await this.authService.logout(refreshToken);
      } catch {
        // best effort
      }
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(204).end();
  }
}
