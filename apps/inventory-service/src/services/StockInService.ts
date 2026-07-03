import { randomUUID } from 'crypto';
import { IInventoryRepository } from '../repositories/interfaces/IInventoryRepository';
import { StockInDto, stockInSchema } from '../validation/inventory.validation';
import { ValidationError, DatabaseError } from '../errors';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger, createLogger } from '@inventory/shared-logger';
import { createStockInCreatedEvent, createAuditLoggedEvent } from '@inventory/shared-events';
import { AuditAction } from '@inventory/shared-types';

export class StockInService {
  constructor(
    private readonly repository: IInventoryRepository,
    private readonly eventBus?: EventBus,
    private readonly logger: Logger = createLogger()
  ) {}

  async stockIn(dto: StockInDto, user: { userId: string; username: string; role: string } | string, correlationId?: string): Promise<unknown> {
    // 1. Validate payload
    const validationResult = stockInSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid stock in data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const { productId, quantity } = validationResult.data;
    const userId = typeof user === 'string' ? user : user.userId;

    try {
      // 2. Create Stock In transaction
      const transaction = await this.repository.createStockInTransaction({
        productId,
        quantity,
        createdBy: userId,
      });

      // 3. Update Inventory item quantity
      const updatedItem = await this.repository.upsertItem(productId, quantity);

      // 4. Publish Event
      if (this.eventBus) {
        const cid = correlationId || randomUUID();
        const event = createStockInCreatedEvent(cid, {
          stockInId: transaction.id,
          productId,
          productName: updatedItem.productName,
          quantity,
          userId,
        });

        try {
          await this.eventBus.publish(event.type, event.payload, event.correlationId);
        } catch (publishError) {
          this.logger.error('Failed to publish stock.in.created event', {
            error: publishError instanceof Error ? publishError.message : String(publishError),
            stockInId: transaction.id,
          });
        }

        // Publish Audit Log Event
        if (user && typeof user !== 'string') {
          const auditEvent = createAuditLoggedEvent(cid, {
            auditId: randomUUID(),
            correlationId: cid,
            userId: user.userId,
            username: user.username,
            role: user.role as import("@inventory/shared-types").Role,
            action: AuditAction.CREATE,
            resourceType: 'StockIn',
            resourceId: transaction.id,
            before: null,
            after: (transaction as { toObject?: () => Record<string, unknown> }).toObject?.() ?? (transaction as unknown as Record<string, unknown>),
            metadata: { productId, quantity },
          });
          try {
            await this.eventBus.publish(auditEvent.type, auditEvent.payload, auditEvent.correlationId);
          } catch (auditError) {
            this.logger.error('Failed to publish audit event for stock in', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
            });
          }
        }
      }

      return transaction;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to record stock in: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
