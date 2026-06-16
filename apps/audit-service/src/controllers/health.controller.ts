import { Request, Response } from 'express';

export const healthController = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    service: 'audit-service',
    timestamp: new Date().toISOString(),
  });
};
