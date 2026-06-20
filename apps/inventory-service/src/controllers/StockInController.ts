import { Request, Response } from 'express';
import { StockInService } from '../services/StockInService';
import { StockInDto } from '../validation/inventory.validation';
import { ValidationError, ConflictError, NotFoundError } from '../errors';

type AuthReq = import('express').Request & { user?: { userId: string; username: string; role: string }; correlationId?: string };

export class StockInController {
  constructor(private readonly stockInService: StockInService) {}

  async stockIn(req: Request<Record<string, never>, unknown, StockInDto>, res: Response): Promise<void> {
    try {
      const stockInData = req.body;
      const user = (req as AuthReq).user || 'system';
      const correlationId = (req as AuthReq).correlationId;

      const transaction = await this.stockInService.stockIn(
        stockInData,
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
