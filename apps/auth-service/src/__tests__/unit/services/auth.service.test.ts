import { AuthService } from '../../../services/auth.service';
import { IUserRepository } from '../../../repositories/interfaces/IUserRepository';
import { IRefreshTokenRepository } from '../../../repositories/interfaces/IRefreshTokenRepository';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger } from '@inventory/shared-logger';
import { User, Role } from '@inventory/shared-types';
import bcrypt from 'bcrypt';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '@inventory/shared-auth';
import { config } from '../../../config';
import { AuthenticationError, ConflictError } from '../../../errors';

jest.mock('bcrypt');
jest.mock('@inventory/shared-auth');
jest.mock('../../../config');

const mockedCreateAccessToken = createAccessToken as jest.MockedFunction<typeof createAccessToken>;
const mockedCreateRefreshToken = createRefreshToken as jest.MockedFunction<typeof createRefreshToken>;
const mockedVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<typeof verifyRefreshToken>;

describe('AuthService', () => {
  let userRepo: jest.Mocked<IUserRepository>;
  let refreshRepo: jest.Mocked<IRefreshTokenRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let logger: jest.Mocked<Logger>;
  let authService: AuthService;

  const mockConfig = {
    jwtSecret: 'test_jwt_secret',
    jwtExpiresIn: 900,
    jwtRefreshSecret: 'test_refresh_secret',
    jwtRefreshExpiresIn: 604800,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (bcrypt.hash as jest.Mock) = jest.fn();
    (bcrypt.compare as jest.Mock) = jest.fn();

    userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
    };
    refreshRepo = {
      save: jest.fn(),
      findByJti: jest.fn(),
      deleteByJti: jest.fn(),
    };

    eventBus = { publish: jest.fn() } as any;
    logger = { info: jest.fn(), error: jest.fn() } as any;

    (config as any) = mockConfig;

    mockedCreateAccessToken.mockReturnValue('access_token');
    mockedCreateRefreshToken.mockReturnValue('refresh_token');
    mockedVerifyRefreshToken.mockReturnValue({ sub: 'user_id', username: 'testuser', role: Role.USER, jti: 'jti' });

    authService = new AuthService(
      userRepo as any,
      refreshRepo as any,
      eventBus as any,
      logger as any,
      config as any
    );
  });

  describe('register', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const username = 'testuser';
    const role = Role.USER;
    const hashedPassword = 'hashed_password';
    const userId = 'user_id_123';

    it('should register new user successfully', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockResolvedValue({
        id: userId,
        email,
        username,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      } as User);

      const result = await authService.register({ email, password, username, role });

      expect(result).toMatchObject({
        id: userId,
        email,
        username,
        role,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          username,
          passwordHash: hashedPassword,
          role,
        })
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.created',
          payload: expect.objectContaining({
            userId: userId,
            email,
            username,
            role,
          }),
        })
      );
    });

    it('should throw ConflictError if email already exists', async () => {
      userRepo.findByEmail.mockResolvedValue({} as User);

      await expect(
        authService.register({ email, password, username, role })
      ).rejects.toThrow(ConflictError);
      expect(userRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const user: User = {
      id: 'user_id',
      email: 'test@example.com',
      username: 'testuser',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
    };

    beforeEach(() => {
      (bcrypt.compare as jest.Mock) = jest.fn();
    });

    it('should return tokens and user on valid credentials', async () => {
      const password = 'password';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepo.findByEmail.mockResolvedValue(user);

      const result = await authService.login(user.email, password);

      expect(result).toEqual({
        user,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, expect.any(String));
      expect(mockedCreateAccessToken).toHaveBeenCalledWith(
        { sub: user.id, username: user.username, role: user.role },
        mockConfig.jwtSecret,
        mockConfig.jwtExpiresIn
      );
      expect(mockedCreateRefreshToken).toHaveBeenCalledWith(
        { sub: user.id, username: user.username, role: user.role },
        mockConfig.jwtRefreshSecret,
        mockConfig.jwtRefreshExpiresIn
      );
      expect(refreshRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          jti: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should throw AuthenticationError on invalid password', async () => {
      const password = 'wrong';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      userRepo.findByEmail.mockResolvedValue(user);

      await expect(authService.login(user.email, password)).rejects.toThrow(AuthenticationError);
      expect(mockedCreateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if user not found', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password')).rejects.toThrow(AuthenticationError);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const userId = 'user_id';
    const jti = 'refresh_jti';
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const refreshTokenRecord = { userId, jti, expiresAt };

    beforeEach(() => {
      mockedVerifyRefreshToken.mockReturnValue({ sub: userId, username: 'testuser', role: Role.USER, jti });
    });

    it('should return new access token and rotate refresh token', async () => {
      refreshRepo.findByJti.mockResolvedValue(refreshTokenRecord);

      const result = await authService.refresh('dummy_token');

      expect(result.accessToken).toBe('access_token');
      expect(mockedCreateAccessToken).toHaveBeenCalledWith(
        { sub: userId, username: 'testuser', role: Role.USER },
        mockConfig.jwtSecret,
        mockConfig.jwtExpiresIn
      );
      expect(refreshRepo.deleteByJti).toHaveBeenCalledWith(jti);
      expect(refreshRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          jti: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should throw AuthenticationError if refresh token invalid', async () => {
      mockedVerifyRefreshToken.mockReturnValue(null);
      await expect(authService.refresh('invalid_token')).rejects.toThrow(AuthenticationError);
      expect(refreshRepo.findByJti).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if refresh token not found in DB', async () => {
      refreshRepo.findByJti.mockResolvedValue(null);
      await expect(authService.refresh('valid_token')).rejects.toThrow(AuthenticationError);
      expect(mockedVerifyRefreshToken).toHaveBeenCalledWith('valid_token', mockConfig.jwtRefreshSecret);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      const jti = 'jti_to_revoke';
      refreshRepo.findByJti.mockResolvedValue({ jti, userId: 'user_id', expiresAt: new Date() });

      await authService.logout('token');

      expect(refreshRepo.deleteByJti).toHaveBeenCalledWith(jti);
    });
  });
});
