import { sign as jwtSign } from 'jsonwebtoken';
import {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../src/tokens';
import { getPermissionsForRole, ROLES_PERMISSIONS } from '../src/permissions';
import { hashPassword, verifyPassword } from '../src/utils';
import { loginSchema, registerSchema, refreshTokenSchema } from '../src/schemas';
import { authenticate, authorize } from '../src/middleware';
import { Role } from '@inventory/shared-types';

describe('shared-auth tokens', () => {
  const secret = 'testsecret';
  const payload: TokenPayload = { sub: 'user123', role: Role.USER };

  it('createAccessToken returns a string', () => {
    const token = createAccessToken(payload, secret);
    expect(typeof token).toBe('string');
  });

  it('verifyAccessToken returns payload', () => {
    const token = createAccessToken(payload, secret);
    const decoded = verifyAccessToken(token, secret);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('user123');
    expect(decoded?.role).toBe(Role.USER);
  });

  it('verifyAccessToken returns null for invalid token', () => {
    const decoded = verifyAccessToken('invalidtoken', secret);
    expect(decoded).toBeNull();
  });
});

describe('shared-auth access token expiry', () => {
  it('verifyAccessToken returns null for expired token', () => {
    const secret = 'testsecret';
    const payload: TokenPayload = { sub: 'user123', role: Role.USER };
    const pastExp = Math.floor(Date.now() / 1000) - 100;
    const payloadWithExp = { ...payload, exp: pastExp };
    const expiredToken = jwtSign(payloadWithExp, secret);
    const decoded = verifyAccessToken(expiredToken, secret);
    expect(decoded).toBeNull();
  });
});

describe('shared-auth refresh tokens', () => {
  const secret = 'testsecret';
  const payload: TokenPayload = { sub: 'user123', role: Role.USER };

  it('createRefreshToken returns a string', () => {
    const token = createRefreshToken(payload, secret);
    expect(typeof token).toBe('string');
  });

  it('verifyRefreshToken returns payload', () => {
    const token = createRefreshToken(payload, secret);
    const decoded = verifyRefreshToken(token, secret);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('user123');
    expect(decoded?.role).toBe(Role.USER);
  });

  it('verifyRefreshToken returns payload with jti', () => {
    const token = createRefreshToken(payload, secret);
    const decoded = verifyRefreshToken(token, secret);
    expect(decoded).not.toBeNull();
    expect(decoded?.jti).toBeDefined();
    expect(typeof decoded?.jti).toBe('string');
  });

  it('verifyRefreshToken returns null for invalid token', () => {
    const decoded = verifyRefreshToken('invalidtoken', secret);
    expect(decoded).toBeNull();
  });
});

describe('shared-auth utils', () => {
  it('hashPassword returns a string', async () => {
    const hash = await hashPassword('password123');
    expect(typeof hash).toBe('string');
  });

  it('verifyPassword returns true for correct password', async () => {
    const password = 'password123';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('verifyPassword returns false for incorrect password', async () => {
    const password = 'password123';
    const wrong = 'wrongpass';
    const hash = await hashPassword(password);
    const result = await verifyPassword(wrong, hash);
    expect(result).toBe(false);
  });
});

describe('shared-auth permissions', () => {
  it('ADMIN has all permissions', () => {
    expect(ROLES_PERMISSIONS[Role.ADMIN]).toContain('*');
  });

  it('USER has expected permissions', () => {
    const perms = getPermissionsForRole(Role.USER);
    expect(perms).toContain('product:read');
    expect(perms).toContain('inventory:read');
  });

  it('unknown role returns empty array', () => {
    const fakeRole = 'CUSTOMER' as Role;
    const perms = getPermissionsForRole(fakeRole);
    expect(perms).toEqual([]);
  });
});

describe('shared-auth validation schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const data = { email: 'test@example.com', password: 'pass123' };
      expect(loginSchema.parse(data)).toEqual(data);
    });

    it('rejects invalid email', () => {
      const data = { email: 'invalidemail', password: 'pass123' };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it('rejects missing password', () => {
      const data = { email: 'test@example.com' };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const data = { email: 'test@example.com', password: 'pass123' };
      expect(registerSchema.parse(data)).toMatchObject(data);
    });

    it('accepts valid role', () => {
      const data = { email: 'test@example.com', password: 'pass123', role: Role.ADMIN };
      expect(registerSchema.parse(data).role).toBe(Role.ADMIN);
    });

    it('rejects short password', () => {
      const data = { email: 'test@example.com', password: '123' };
      expect(() => registerSchema.parse(data)).toThrow();
    });

    it('rejects missing email', () => {
      const data = { password: 'pass123' };
      expect(() => registerSchema.parse(data)).toThrow();
    });
  });

  describe('refreshTokenSchema', () => {
    it('accepts valid refresh token', () => {
      const data = { refreshToken: 'abc.def.ghi' };
      expect(refreshTokenSchema.parse(data)).toEqual(data);
    });

    it('rejects empty refresh token', () => {
      const data = { refreshToken: '' };
      expect(() => refreshTokenSchema.parse(data)).toThrow();
    });
  });
});

describe('shared-auth middleware', () => {
  const secret = 'testsecret';
  const payload = { sub: 'user123', role: Role.USER };
  let token: string;

  beforeAll(() => {
    token = createAccessToken(payload, secret);
  });

  describe('authenticate', () => {
    it('returns 401 if no Authorization header', () => {
      const req = { headers: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authenticate(secret);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 if invalid token', () => {
      const req = { headers: { authorization: 'Bearer invalid' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authenticate(secret);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('sets req.user and calls next if valid token', () => {
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authenticate(secret);
      middleware(req, res, next);
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user123');
      expect(req.user.role).toBe(Role.USER);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    const createReqWithUser = (role: Role) => {
      const t = createAccessToken({ sub: 'user123', role }, secret);
      return {
        headers: { authorization: `Bearer ${t}` },
        user: { userId: 'user123', role },
      } as any;
    };

    it('returns 401 if no user', () => {
      const req = {} as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authorize(['product:read']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if user has required permission', () => {
      const req = createReqWithUser(Role.USER);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authorize(['product:read']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('blocks if user lacks required permission', () => {
      const req = createReqWithUser(Role.USER);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authorize(['product:create']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('allows ADMIN any permission', () => {
      const req = createReqWithUser(Role.ADMIN);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      const next = jest.fn();
      const middleware = authorize(['any:permission']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
