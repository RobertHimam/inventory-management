"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const tokens_1 = require("./tokens");
const permissions_1 = require("./permissions");
const authenticate = (secret) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'No token provided' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, tokens_1.verifyAccessToken)(token, secret);
        if (!decoded) {
            res.status(401).json({ success: false, error: 'Invalid token' });
            return;
        }
        req.user = {
            userId: decoded.sub,
            role: decoded.role
        };
        next();
    };
};
exports.authenticate = authenticate;
const authorize = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const permissions = (0, permissions_1.getPermissionsForRole)(req.user.role);
        // ADMIN with '*' has all permissions
        if (permissions.includes('*')) {
            return next();
        }
        const hasAll = requiredPermissions.every(perm => permissions.includes(perm));
        if (!hasAll) {
            res.status(403).json({ success: false, error: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=middleware.js.map