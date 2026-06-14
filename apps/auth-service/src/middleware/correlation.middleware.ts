import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const correlationMiddleware = (req: any, _res: Response, next: NextFunction) => {
  req.correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  next();
};
