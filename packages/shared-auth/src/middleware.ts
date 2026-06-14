import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './tokens';
import { getPermissionsForRole } from './permissions';
import { Role } from '@inventory/shared-types';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
  };
}

export const authenticate = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token, secret);
    if (!decoded) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    (req as AuthenticatedRequest).user = {
      userId: decoded.sub,
      role: decoded.role,
    };
    next();
  };
};

export const authorize = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const permissions = getPermissionsForRole(req.user.role);
    // ADMIN with '*' has all permissions
    if (permissions.includes('*')) {
      return next();
    }
    const hasAll = requiredPermissions.every((perm) => permissions.includes(perm));
    if (!hasAll) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
