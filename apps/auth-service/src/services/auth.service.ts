import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '@inventory/shared-auth';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger } from '@inventory/shared-logger';
import { User, Role } from '@inventory/shared-types';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IRefreshTokenRepository } from '../repositories/interfaces/IRefreshTokenRepository';
import { config } from '../config';
import { IAuthService } from './IAuthService';
import { AuthenticationError, ConflictError } from '../errors';
import { createUserCreatedEvent } from '@inventory/shared-events';

export class AuthService implements IAuthService {
  constructor(
    private userRepo: IUserRepository,
    private refreshTokenRepo: IRefreshTokenRepository,
    private eventBus: EventBus,
    private logger: Logger,
    private cfg: typeof config
  ) {}

  async register(
    data: { email: string; password: string; username: string; role?: string },
    correlationId?: string
  ): Promise<User> {
    const { email, password, username, role = Role.USER } = data;
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already exists');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userRepo.create({
      email,
      username,
      passwordHash,
      role,
    });

    const cid = correlationId ?? randomUUID();
    const event = createUserCreatedEvent(cid, {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    try {
      await this.eventBus.publish(event);
    } catch (err) {
      this.logger.error('Failed to publish user.created event', err as Error);
      // continue
    }

    return user;
  }

  async login(
    email: string,
    password: string,
    correlationId?: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AuthenticationError('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AuthenticationError('Invalid credentials');

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = createAccessToken(
      payload,
      this.cfg.jwtSecret,
      Number(this.cfg.jwtExpiresIn)
    );
    const refreshToken = createRefreshToken(
      payload,
      Number(this.cfg.jwtRefreshExpiresIn)
    );

    const decoded = verifyRefreshToken(
      refreshToken,
      this.cfg.jwtRefreshSecret
    );
    if (!decoded) throw new AuthenticationError('Failed to verify refresh token');

    await this.refreshTokenRepo.save({
      userId: user.id,
      jti: decoded.jti,
      expiresAt: new Date(decoded.exp * 1000),
    });

    return { user, accessToken, refreshToken };
  }

  async refresh(
    refreshTokenStr: string,
    correlationId?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(
      refreshTokenStr,
      this.cfg.jwtRefreshSecret
    );
    if (!payload) throw new AuthenticationError('Invalid refresh token');

    const stored = await this.refreshTokenRepo.findByJti(payload.jti);
    if (!stored) throw new AuthenticationError('Refresh token not found');

    const newPayload = {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    const accessToken = createAccessToken(
      newPayload,
      this.cfg.jwtSecret,
      Number(this.cfg.jwtExpiresIn)
    );
    const newRefreshToken = createRefreshToken(
      newPayload,
      Number(this.cfg.jwtRefreshExpiresIn)
    );

    await this.refreshTokenRepo.deleteByJti(payload.jti);
    const newDecoded = verifyRefreshToken(
      newRefreshToken,
      this.cfg.jwtRefreshSecret
    );
    if (!newDecoded)
      throw new AuthenticationError('Failed to verify new refresh token');
    await this.refreshTokenRepo.save({
      userId: payload.sub,
      jti: newDecoded.jti,
      expiresAt: new Date(newDecoded.exp * 1000),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(
    refreshTokenStr: string,
    correlationId?: string
  ): Promise<void> {
    const payload = verifyRefreshToken(
      refreshTokenStr,
      this.cfg.jwtRefreshSecret
    );
    if (!payload) return;
    await this.refreshTokenRepo.deleteByJti(payload.jti);
  }
}
