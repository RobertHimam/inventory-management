import { randomUUID } from 'crypto';
import { IInventoryRepository } from '../repositories/interfaces/IInventoryRepository';
import { StockOutDto, stockOutSchema } from '../validation/inventory.validation';
import { ValidationError, DatabaseError } from '../errors';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger, createLogger } from '@inventory/shared-logger';
import { createStockOutCreatedEvent, createLowStockDetectedEvent, createAuditLoggedEvent } from '@inventory/shared-events';
import { AuditAction } from '@inventory/shared-types';

export class StockOutService {
  constructor(
    private readonly repository: IInventoryRepository,
    private readonly eventBus?: EventBus,
    private readonly logger: Logger = createLogger()
  ) {}

  async stockOut(dto: StockOutDto, user: { userId: string; username: string; role: string } | string, correlationId?: string): Promise<unknown> {
    // 1. Validate payload
    const validationResult = stockOutSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid stock out data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const { productId, quantity } = validationResult.data;
    const userId = typeof user === 'string' ? user : user.userId;

    // 2. Check current stock level
    const inventoryItem = await this.repository.findItemByProductId(productId);
    if (!inventoryItem) {
      throw new ValidationError(`Inventory item not found for product: ${productId}`);
    }

    if (inventoryItem.quantity < quantity) {
      throw new ValidationError(
        `Insufficient stock. Available: ${inventoryItem.quantity}, Requested: ${quantity}`
      );
    }

    try {
      // 3. Create Stock Out transaction
      const transaction = await this.repository.createStockOutTransaction({
        productId,
        quantity,
        createdBy: userId,
      });

      // 4. Update Inventory quantity
      const updatedItem = await this.repository.upsertItem(productId, -quantity);

      // 5. Publish events
      if (this.eventBus) {
        const cid = correlationId || randomUUID();

        // 5a. Publish stock.out.created
        const outEvent = createStockOutCreatedEvent(cid, {
          stockOutId: transaction.id,
          productId,
          productName: updatedItem.productName,
          quantity,
          userId,
        });

        try {
          await this.eventBus.publish(outEvent.type, outEvent.payload, outEvent.correlationId);
        } catch (publishError) {
          this.logger.error('Failed to publish stock.out.created event', {
            error: publishError instanceof Error ? publishError.message : String(publishError),
            stockOutId: transaction.id,
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
            resourceType: 'StockOut',
            resourceId: transaction.id,
            before: null,
            after: (transaction as { toObject?: () => Record<string, unknown> }).toObject?.() ?? (transaction as unknown as Record<string, unknown>),
            metadata: { productId, quantity },
          });
          try {
            await this.eventBus.publish(auditEvent.type, auditEvent.payload, auditEvent.correlationId);
          } catch (auditError) {
            this.logger.error('Failed to publish audit event for stock out', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
            });
          }
        }

        // 5b. Check for low stock condition: current quantity <= reorderLevel
        if (updatedItem.quantity <= (updatedItem.reorderLevel ?? 10)) {
          const lowStockEvent = createLowStockDetectedEvent(cid, {
            productId,
            productName: updatedItem.productName,
            currentQuantity: updatedItem.quantity,
            reorderLevel: updatedItem.reorderLevel ?? 10,
            timestamp: new Date(),
          });

          try {
            await this.eventBus.publish(
              lowStockEvent.type,
              lowStockEvent.payload,
              lowStockEvent.correlationId
            );
          } catch (publishError) {
            this.logger.error('Failed to publish stock.low.detected event', {
              error: publishError instanceof Error ? publishError.message : String(publishError),
              productId,
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
        `Failed to record stock out: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
