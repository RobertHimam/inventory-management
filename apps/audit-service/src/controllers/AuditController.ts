import { Request, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { listAuditQuerySchema } from '../validation/audit.validation';
import { ValidationError } from '../errors';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query;
      const validationResult = listAuditQuerySchema.safeParse(query);
      if (!validationResult.success) {
        throw new ValidationError(
          `Invalid query parameters: ${JSON.stringify(validationResult.error.errors)}`
        );
      }

      const result = await this.auditService.listAuditLogs(validationResult.data);
      const totalPages = validationResult.data.limit > 0 ? Math.ceil(result.total / validationResult.data.limit) : 0;

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: validationResult.data.page,
          limit: validationResult.data.limit,
          total: result.total,
          totalPages,
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  }
}
