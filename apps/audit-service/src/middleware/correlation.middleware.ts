import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.headers['x-correlation-id']?.toString() ?? randomUUID();
  res.set('x-correlation-id', correlationId);
  (req as any).correlationId = correlationId;
  next();
};
