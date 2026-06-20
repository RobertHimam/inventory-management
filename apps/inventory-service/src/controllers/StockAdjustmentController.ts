import { Request, Response } from 'express';
import { StockAdjustmentService } from '../services/StockAdjustmentService';
import { StockAdjustmentDto } from '../validation/inventory.validation';
import { ValidationError, ConflictError, NotFoundError } from '../errors';

type AuthReq = import('express').Request & { user?: { userId: string; username: string; role: string }; correlationId?: string };

export class StockAdjustmentController {
  constructor(private readonly stockAdjustmentService: StockAdjustmentService) {}

  async adjustStock(req: Request<Record<string, never>, unknown, StockAdjustmentDto>, res: Response): Promise<void> {
    try {
      const adjustData = req.body;
      const user = (req as AuthReq).user || 'system';
      const correlationId = (req as AuthReq).correlationId;

      const transaction = await this.stockAdjustmentService.adjustStock(
        adjustData,
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
