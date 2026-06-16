import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { verifyAccessToken } from '@inventory/shared-auth';
import { SSEService } from './services/SSEService';
import { Role } from '@inventory/shared-types';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
  };
}

export function createApp(sseService: SSEService, jwtSecret: string): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Custom SSE Authentication middleware that supports query parameters
  const sseAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
    let token: string | undefined;

    // Check header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Check query parameter
    if (!token && req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = verifyAccessToken(token, jwtSecret);
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

  app.get('/events', sseAuthenticate, (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    // Connection tracking & limits check
    const success = sseService.addConnection(user.userId, res);
    if (!success) {
      res.status(429).json({ success: false, error: 'Max 5 connections per user limit reached' });
      return;
    }

    // Write SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send retry instruction to support auto reconnect
    res.write('retry: 10000\n\n');

    // Clean up connection when client disconnects
    req.on('close', () => {
      sseService.removeConnection(user.userId, res);
    });
  });

  return app;
}
