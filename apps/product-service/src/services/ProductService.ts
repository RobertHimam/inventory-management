import { randomUUID } from 'crypto';
import { IProductRepository } from '../repositories/interfaces/IProductRepository';
import { CreateProductDto, UpdateProductDto, ListProductsQueryDto } from '../validation/product.validation';
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from '../validation/product.validation';
import { ConflictError, DatabaseError, ValidationError, NotFoundError } from '../errors';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger, createLogger } from '@inventory/shared-logger';
import { createProductCreatedEvent, createProductUpdatedEvent, createProductDeletedEvent, createAuditLoggedEvent } from '@inventory/shared-events';
import { AuditAction } from '@inventory/shared-types';

export class ProductService {
  constructor(
    private readonly repository: IProductRepository,
    private readonly eventBus?: EventBus,
    private readonly logger: Logger = createLogger()
  ) {}

  async createProduct(dto: CreateProductDto, correlationId?: string, user?: any): Promise<any> {
    // 1. Validate DTO
    const validationResult = createProductSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid product data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const validatedDto = validationResult.data;

    // 2. Check for duplicate SKU
    const existing = await this.repository.findBySku(validatedDto.sku);
    if (existing) {
      throw new ConflictError(`Product with SKU '${validatedDto.sku}' already exists`);
    }

    // 3. Create product
    try {
      const product = await this.repository.create(validatedDto);

      // Publish event
      if (this.eventBus) {
        const cid = correlationId || randomUUID();
        const event = createProductCreatedEvent(cid, {
          productId: product._id.toString(),
          name: product.name,
          sku: product.sku,
          categoryId: product.category,
          price: product.price,
          stockQuantity: product.stockQuantity,
        });
        try {
          await this.eventBus.publish(event.type, event.payload, event.correlationId);
        } catch (publishError) {
          this.logger.error('Failed to publish product.created event', {
            error: publishError instanceof Error ? publishError.message : String(publishError),
            productId: product._id.toString(),
          });
        }

        // Publish Audit Log Event
        if (user) {
          const auditEvent = createAuditLoggedEvent(cid, {
            auditId: randomUUID(),
            correlationId: cid,
            userId: user.userId,
            username: user.username,
            role: user.role,
            action: AuditAction.CREATE,
            resourceType: 'Product',
            resourceId: product._id.toString(),
            before: null,
            after: product.toObject ? product.toObject() : product,
            metadata: { sku: product.sku },
          });
          try {
            await this.eventBus.publish(auditEvent.type, auditEvent.payload, auditEvent.correlationId);
          } catch (auditError) {
            this.logger.error('Failed to publish audit event for product creation', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
            });
          }
        }
      }

      return product;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      throw new DatabaseError(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto, correlationId?: string, user?: any): Promise<any> {
    // 1. Validate DTO (allow partial)
    const validationResult = updateProductSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid product data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const validatedDto = validationResult.data;

    // 2. Check if product exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    // 3. Check for SKU conflict if SKU is being updated
    if (validatedDto.sku && validatedDto.sku !== existing.sku) {
      const duplicate = await this.repository.findBySku(validatedDto.sku);
      if (duplicate && duplicate._id.toString() !== id) {
        throw new ConflictError(`Product with SKU '${validatedDto.sku}' already exists`);
      }
    }

    // 4. Update product
    try {
      const product = await this.repository.update(id, validatedDto);
      if (!product) {
        throw new NotFoundError(`Product with ID '${id}' not found`);
      }

      // Publish event
      if (this.eventBus) {
        const cid = correlationId || randomUUID();
        const event = createProductUpdatedEvent(cid, {
          productId: product._id.toString(),
          name: product.name,
          sku: product.sku,
          categoryId: product.category,
          price: product.price,
          isActive: product.isActive,
        });
        try {
          await this.eventBus.publish(event.type, event.payload, event.correlationId);
        } catch (publishError) {
          this.logger.error('Failed to publish product.updated event', {
            error: publishError instanceof Error ? publishError.message : String(publishError),
            productId: product._id.toString(),
          });
        }

        // Publish Audit Log Event
        if (user) {
          const auditEvent = createAuditLoggedEvent(cid, {
            auditId: randomUUID(),
            correlationId: cid,
            userId: user.userId,
            username: user.username,
            role: user.role,
            action: AuditAction.UPDATE,
            resourceType: 'Product',
            resourceId: product._id.toString(),
            before: existing.toObject ? existing.toObject() : existing,
            after: product.toObject ? product.toObject() : product,
            metadata: { sku: product.sku },
          });
          try {
            await this.eventBus.publish(auditEvent.type, auditEvent.payload, auditEvent.correlationId);
          } catch (auditError) {
            this.logger.error('Failed to publish audit event for product update', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
            });
          }
        }
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteProduct(id: string, deletedBy: string, correlationId?: string, user?: any): Promise<any> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    try {
      const product = await this.repository.delete(id, deletedBy);
      if (!product) {
        throw new NotFoundError(`Product with ID '${id}' not found`);
      }

      // Publish event
      if (this.eventBus) {
        const cid = correlationId || randomUUID();
        const event = createProductDeletedEvent(cid, {
          productId: product._id.toString(),
          deletedBy,
        });
        try {
          await this.eventBus.publish(event.type, event.payload, event.correlationId);
        } catch (publishError) {
          this.logger.error('Failed to publish product.deleted event', {
            error: publishError instanceof Error ? publishError.message : String(publishError),
            productId: product._id.toString(),
          });
        }

        // Publish Audit Log Event
        if (user) {
          const auditEvent = createAuditLoggedEvent(cid, {
            auditId: randomUUID(),
            correlationId: cid,
            userId: user.userId,
            username: user.username,
            role: user.role,
            action: AuditAction.DELETE,
            resourceType: 'Product',
            resourceId: product._id.toString(),
            before: existing.toObject ? existing.toObject() : existing,
            after: product.toObject ? product.toObject() : product,
            metadata: { sku: product.sku },
          });
          try {
            await this.eventBus.publish(auditEvent.type, auditEvent.payload, auditEvent.correlationId);
          } catch (auditError) {
            this.logger.error('Failed to publish audit event for product deletion', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
            });
          }
        }
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listProducts(query: Partial<ListProductsQueryDto>): Promise<any> {
    const validationResult = listProductsQuerySchema.safeParse(query);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid query parameters: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const validatedQuery = validationResult.data;

    try {
      const { data, total } = await this.repository.findAll(validatedQuery);
      const totalPages = validatedQuery.limit > 0 ? Math.ceil(total / validatedQuery.limit) : 0;

      return {
        data,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      throw new DatabaseError(`Failed to list products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProductDetail(id: string): Promise<any> {
    try {
      const product = await this.repository.findById(id);
      if (!product) {
        throw new NotFoundError(`Product with ID '${id}' not found`);
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to retrieve product detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
