import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticationError } from '../errors';

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Register a new user
   *     description: Creates a new user account with the provided credentials
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: User successfully registered
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid input or user already exists
   *       500:
   *         description: Server error
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, username, role } = req.body as {
        email: string;
        password: string;
        username: string;
        role?: string;
      };
      const user = await this.authService.register({ email, password, username, role });
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: User login
   *     description: Authenticates a user and returns access token (refresh token in HttpOnly cookie)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: User successfully authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TokenResponse'
   *         headers:
   *           Set-Cookie:
   *             schema:
   *               type: string
   *               example: refreshToken=abc123; HttpOnly; Secure; SameSite=Strict
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Server error
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Refresh access token
   *     description: Uses refresh token from cookie to issue a new access token
   *     responses:
   *       200:
   *         description: New access token issued
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RefreshResponse'
   *         headers:
   *           Set-Cookie:
   *             schema:
   *               type: string
   *               example: refreshToken=abc123; HttpOnly; Secure; SameSite=Strict
   *       401:
   *         description: No refresh token or token expired
   *       500:
   *         description: Server error
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: User logout
   *     description: Invalidates the refresh token and clears the refresh token cookie
   *     responses:
   *       204:
   *         description: User successfully logged out
   *       500:
   *         description: Server error
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (error) {
      next(error);
    }
  }
}
