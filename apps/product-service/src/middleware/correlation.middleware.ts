import { Request, Response, NextFunction } from 'express';

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.headers['x-correlation-id']?.toString() ?? crypto.randomUUID();
  res.set('x-correlation-id', correlationId);
  (req as any).correlationId = correlationId;
  next();
};
