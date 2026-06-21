import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { randomUUID } from 'crypto';
import { verifyAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { config } from './config';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
  };
  correlationId?: string;
}

// In-memory Rate Limiter to satisfy limits without external dependencies
interface RateLimitInfo {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitInfo>();

function rateLimiter(windowMs: number, maxRequests: number, keyPrefix: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let info = rateLimitStore.get(key);
    if (!info || now > info.resetTime) {
      info = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    info.count++;
    rateLimitStore.set(key, info);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - info.count));
    res.setHeader('X-RateLimit-Reset', new Date(info.resetTime).toISOString());

    if (info.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later.',
      });
      return;
    }
    next();
  };
}

// Lightweight reverse proxy utilizing Node's http.request
function proxyTo(targetUrl: string) {
  return (req: Request, res: Response): void => {
    try {
      const target = new URL(targetUrl);
      const options: http.RequestOptions = {
        protocol: target.protocol,
        host: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        method: req.method,
        path: req.originalUrl,
        headers: {
          ...req.headers,
          host: target.host,
          'x-correlation-id': (req as AuthenticatedRequest).correlationId || req.headers['x-correlation-id'] || '',
        },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error(`Gateway proxy error routing to ${targetUrl}:`, err);
        res.status(502).json({
          success: false,
          error: 'Bad Gateway',
          message: err.message,
        });
      });

      req.pipe(proxyReq);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

export function createApp(jwtSecret: string): Application {
  const app = express();

  // CORS Config
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
    })
  );

  app.use(cookieParser());

  // Correlation ID Generator middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    (req as AuthenticatedRequest).correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  // Health route
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'gateway' });
  });

  // Rate Limiting
  const authLimiter = rateLimiter(config.rateLimitWindowMs, config.rateLimitAuthMax, 'auth');
  const generalLimiter = rateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests, 'general');

  // JWT Validation Middleware
  const gatewayAuth = (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path;
    // Public routes bypass auth
    if (path.startsWith('/auth') || path === '/health' || path === '/api-docs') {
      return next();
    }

    let token: string | undefined;

    // Check Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Check query token (for SSE events)
    if (!token && req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'No token provided' });
      return;
    }

    const decoded = verifyAccessToken(token, jwtSecret);
    if (!decoded) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid token' });
      return;
    }

    (req as AuthenticatedRequest).user = {
      userId: decoded.sub,
      role: decoded.role,
    };
    next();
  };

  // RBAC Guard Middleware
  const rbacGuard = (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path;
    if (path.startsWith('/auth') || path === '/health' || path === '/api-docs') {
      return next();
    }

    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (user.role === Role.ADMIN) {
      return next();
    }

    if (user.role === Role.USER) {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (isMutation) {
        res.status(403).json({ success: false, error: 'Forbidden', message: 'Insufficient permissions' });
        return;
      }

      // Check admin restricted routes
      if (
        path.startsWith('/reports/sales') ||
        path.startsWith('/reports/inventory-valuation') ||
        path.startsWith('/audit')
      ) {
        res.status(403).json({ success: false, error: 'Forbidden', message: 'Insufficient permissions' });
        return;
      }

      return next();
    }

    res.status(403).json({ success: false, error: 'Forbidden' });
  };

  // Mount Authentication & RBAC Guard before proxying
  app.use(gatewayAuth);
  app.use(rbacGuard);

  // Apply Auth rate limits
  app.use('/auth', authLimiter);
  // Apply General rate limits to all other requests
  app.use('/products', generalLimiter);
  app.use('/categories', generalLimiter);
  app.use('/suppliers', generalLimiter);
  app.use('/inventory', generalLimiter);
  app.use('/reports', generalLimiter);
  app.use('/notifications', generalLimiter);
  app.use('/audit', generalLimiter);
  app.use('/events', generalLimiter);
  app.use('/users', generalLimiter);

  // Reverse Proxy Routing mappings
  app.use('/auth', proxyTo(config.authServiceUrl));
  app.use('/users', proxyTo(config.authServiceUrl));
  app.use('/products', proxyTo(config.productServiceUrl));
  app.use('/categories', proxyTo(config.productServiceUrl));
  app.use('/suppliers', proxyTo(config.productServiceUrl));
  app.use('/inventory', proxyTo(config.inventoryServiceUrl));
  app.use('/reports', proxyTo(config.reportServiceUrl));
  app.use('/notifications', proxyTo(config.notificationServiceUrl));
  app.use('/audit', proxyTo(config.auditServiceUrl));
  app.use('/events', proxyTo(config.sseServiceUrl));

  return app;
}
