import { randomUUID } from 'crypto';
import { IInventoryRepository } from '../repositories/interfaces/IInventoryRepository';
import { StockAdjustmentDto, stockAdjustmentSchema } from '../validation/inventory.validation';
import { ValidationError, DatabaseError } from '../errors';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger, createLogger } from '@inventory/shared-logger';
import { createStockAdjustmentCreatedEvent, createLowStockDetectedEvent, createAuditLoggedEvent } from '@inventory/shared-events';
import { AuditAction } from '@inventory/shared-types';

export class StockAdjustmentService {
  constructor(
    private readonly repository: IInventoryRepository,
    private readonly eventBus?: EventBus,
    private readonly logger: Logger = createLogger()
  ) {}

  async adjustStock(dto: StockAdjustmentDto, user: { userId: string; username: string; role: string } | string, correlationId?: string): Promise<unknown> {
    // 1. Validate payload
    const validationResult = stockAdjustmentSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid stock adjustment data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const { productId, quantity, reason } = validationResult.data;
    const userId = typeof user === 'string' ? user : user.userId;

    // 2. Check current stock level
    const inventoryItem = await this.repository.findItemByProductId(productId);
    if (!inventoryItem) {
      throw new ValidationError(`Inventory item not found for product: ${productId}`);
    }

    const previousQuantity = inventoryItem.quantity;
    const newQuantity = previousQuantity + quantity;

    if (newQuantity < 0) {
      throw new ValidationError(
        `Invalid adjustment. Current stock is ${previousQuantity}, requested change is ${quantity} which would result in negative stock (${newQuantity}).`
      );
    }

    try {
      // 3. Create Stock Adjustment transaction
      const transaction = await this.repository.createStockAdjustmentTransaction({
        productId,
        quantity,
        previousQuantity,
        newQuantity,
        reason,
        adjustedBy: userId,
      });

      // 4. Update Inventory quantity
      const updatedItem = await this.repository.upsertItem(productId, quantity);

      // 5. Publish events
      if (this.eventBus) {
        const cid = correlationId || randomUUID();

        // 5a. Publish stock.adjustment.created
        const adjustEvent = createStockAdjustmentCreatedEvent(cid, {
          stockAdjustmentId: transaction.id,
          productId,
          quantity,
          previousQuantity,
          newQuantity,
          reason,
        });

        try {
          await this.eventBus.publish(adjustEvent.type, adjustEvent.payload, adjustEvent.correlationId);
        } catch (publishError) {
          this.logger.error('Failed to publish stock.adjustment.created event', {
            error: publishError instanceof Error ? publishError.message : String(publishError),
            stockAdjustmentId: transaction.id,
          });
        }

        // Publish Audit Log Event
        if (user && typeof user !== 'string') {
          const auditEvent = createAuditLoggedEvent(cid, {
            auditId: randomUUID(),
            correlationId: cid,
            userId: user.userId,
            username: user.username,
            role: user.role,
            action: AuditAction.UPDATE,
            resourceType: 'StockAdjustment',
            resourceId: transaction.id,
            before: { quantity: previousQuantity },
            after: (transaction as { toObject?: () => Record<string, unknown> }).toObject ? (transaction as { toObject?: () => Record<string, unknown> }).toObject()! : transaction,
            metadata: { productId, quantity, reason },
          });
          try {
            await this.eventBus.publish(auditEvent.type, auditEvent.payload, auditEvent.correlationId);
          } catch (auditError) {
            this.logger.error('Failed to publish audit event for stock adjustment', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
            });
          }
        }

        // 5b. Check for low stock condition: current quantity <= reorderLevel
        if (updatedItem.quantity <= (updatedItem.reorderLevel ?? 10)) {
          const lowStockEvent = createLowStockDetectedEvent(cid, {
            productId,
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
        `Failed to record stock adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
