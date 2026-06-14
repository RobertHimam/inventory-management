import { Request, Response } from 'express';

export const healthController = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
  });
};
