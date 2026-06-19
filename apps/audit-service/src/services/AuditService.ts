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

  async handleAuditEvent(payload: unknown, headers?: Record<string, unknown>, correlationId?: string): Promise<void> {
    try {
      this.logger.info('Handling audit event from event bus', { correlationId, payload });

      const p = payload as Record<string, unknown>;
      const cid = correlationId || p.correlationId || (headers && headers['X-Correlation-ID']);

      const auditData: Partial<IAuditLog> = {
        correlationId: cid as string,
        userId: p.userId as string,
        username: p.username as string,
        role: p.role as IAuditLog['role'],
        action: p.action as IAuditLog['action'],
        resourceType: p.resourceType as string,
        resourceId: p.resourceId as string,
        before: p.before as Record<string, unknown> | null,
        after: p.after as Record<string, unknown> | null,
        metadata: p.metadata as Record<string, unknown> | null,
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
