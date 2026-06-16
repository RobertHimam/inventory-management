import { IAuditRepository, AuditFindAllOptions, AuditFindAllResult } from '../repositories/interfaces/IAuditRepository';
import { IAuditLog } from '../models/audit.model';
import { Logger } from '@inventory/shared-logger';

export class AuditService {
  constructor(
    private readonly repository: IAuditRepository,
    private readonly logger: Logger
  ) {}

  async createAuditLog(data: Partial<IAuditLog>): Promise<IAuditLog> {
    this.logger.info('Saving audit log', { correlationId: data.correlationId, action: data.action });
    return await this.repository.create(data);
  }

  async listAuditLogs(options: AuditFindAllOptions): Promise<AuditFindAllResult> {
    this.logger.info('Listing audit logs with options', { options });
    return await this.repository.findAll(options);
  }

  async handleAuditEvent(payload: any, headers?: any, correlationId?: string): Promise<void> {
    try {
      this.logger.info('Handling audit event from event bus', { correlationId, payload });

      const cid = correlationId || payload.correlationId || (headers && headers['X-Correlation-ID']);

      const auditData: Partial<IAuditLog> = {
        correlationId: cid,
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        action: payload.action,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        before: payload.before,
        after: payload.after,
        metadata: payload.metadata,
      };

      if (
        !auditData.correlationId ||
        !auditData.userId ||
        !auditData.username ||
        !auditData.role ||
        !auditData.action ||
        !auditData.resourceType ||
        !auditData.resourceId
      ) {
        throw new Error(`Missing required fields for audit log. Given: ${JSON.stringify(auditData)}`);
      }

      await this.createAuditLog(auditData);
    } catch (error) {
      this.logger.error('Failed to handle audit event', {
        error: error instanceof Error ? error.message : String(error),
        payload,
      });
      throw error;
    }
  }
}
