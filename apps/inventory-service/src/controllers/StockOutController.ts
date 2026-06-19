import { Request, Response } from 'express';
import { StockOutService } from '../services/StockOutService';
import { StockOutDto } from '../validation/inventory.validation';
import { ValidationError, ConflictError, NotFoundError } from '../errors';

type AuthReq = import('express').Request & { user?: { userId: string; role: string }; correlationId?: string };

export class StockOutController {
  constructor(private readonly stockOutService: StockOutService) {}

  async stockOut(req: Request<Record<string, never>, unknown, StockOutDto>, res: Response): Promise<void> {
    try {
      const stockOutData = req.body;
      const user = (req as AuthReq).user || 'system';
      const correlationId = (req as AuthReq).correlationId;

      const transaction = await this.stockOutService.stockOut(
        stockOutData,
        user,
        correlationId
      );

      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  }
}
