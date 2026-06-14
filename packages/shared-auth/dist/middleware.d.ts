import { Request, Response, NextFunction } from 'express';
import { Role } from '@inventory/shared-types';
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: Role;
    };
}
export declare const authenticate: (secret: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const authorize: (requiredPermissions: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=middleware.d.ts.map