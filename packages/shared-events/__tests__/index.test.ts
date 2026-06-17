import {
  EVENT_VERSION,
  EventType,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  ProductDeletedPayload,
  StockInPayload,
  StockOutPayload,
  StockAdjustedPayload,
  LowStockAlertPayload,
} from '../src';

import { Product } from '../../shared-types/src';

describe('shared-events', () => {
  describe('Event version', () => {
    it('should have correct version', () => {
      expect(EVENT_VERSION).toBe('v1');
    });
  });

  describe('EventType constants', () => {
    it('should have PRODUCT_CREATED', () => {
      expect(EventType.PRODUCT_CREATED).toBe('product.created');
    });
    it('should have PRODUCT_UPDATED', () => {
      expect(EventType.PRODUCT_UPDATED).toBe('product.updated');
    });
    it('should have PRODUCT_DELETED', () => {
      expect(EventType.PRODUCT_DELETED).toBe('product.deleted');
    });
    it('should have STOCK_IN_CREATED', () => {
      expect(EventType.STOCK_IN_CREATED).toBe('stock.in.created');
    });
    it('should have STOCK_OUT_CREATED', () => {
      expect(EventType.STOCK_OUT_CREATED).toBe('stock.out.created');
    });
    it('should have STOCK_ADJUSTMENT_CREATED', () => {
      expect(EventType.STOCK_ADJUSTMENT_CREATED).toBe('stock.adjustment.created');
    });
    it('should have LOW_STOCK_DETECTED', () => {
      expect(EventType.LOW_STOCK_DETECTED).toBe('stock.low.detected');
    });
    it('should have USER_CREATED', () => {
      expect(EventType.USER_CREATED).toBe('user.created');
    });
    it('should have USER_UPDATED', () => {
      expect(EventType.USER_UPDATED).toBe('user.updated');
    });
    it('should have AUDIT_LOGGED', () => {
      expect(EventType.AUDIT_LOGGED).toBe('audit.logged');
    });
  });

  describe('Payload interfaces', () => {
    it('should accept ProductCreatedPayload', () => {
      const payload: ProductCreatedPayload = {
        product: {
          _id: 'p1',
          name: 'Widget',
          sku: 'W-001',
          category: 'Electronics',
          price: 19.99,
          stockQuantity: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          deletedBy: null,
        },
      };
      expect(payload.product.sku).toBe('W-001');
    });

    it('should accept ProductUpdatedPayload', () => {
      const product: Product = {
        _id: 'p1',
        name: 'Widget',
        sku: 'W-001',
        category: 'Electronics',
        price: 19.99,
        stockQuantity: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      const payload: ProductUpdatedPayload = {
        product: product,
        changes: { price: 24.99 },
        previous: product,
      };
      expect(payload.changes.price).toBe(24.99);
    });

    it('should accept ProductDeletedPayload', () => {
      const payload: ProductDeletedPayload = { productId: 'p1' };
      expect(payload.productId).toBe('p1');
    });

    it('should accept StockInPayload', () => {
      const payload: StockInPayload = {
        productId: 'p1',
        quantity: 50,
        userId: 'u1',
        createdAt: new Date(),
      };
      expect(payload.quantity).toBe(50);
    });

    it('should accept StockOutPayload', () => {
      const payload: StockOutPayload = {
        productId: 'p1',
        quantity: 20,
        userId: 'u1',
        createdAt: new Date(),
      };
      expect(payload.quantity).toBe(20);
    });

    it('should accept StockAdjustedPayload', () => {
      const payload: StockAdjustedPayload = {
        productId: 'p1',
        previousQuantity: 100,
        newQuantity: 98,
        reason: 'damaged',
        adjustedBy: 'u1',
        createdAt: new Date(),
      };
      expect(payload.newQuantity).toBe(98);
    });

    it('should accept LowStockAlertPayload', () => {
      const payload: LowStockAlertPayload = {
        productId: 'p1',
        currentQuantity: 5,
        reorderLevel: 10,
        timestamp: new Date(),
      };
      expect(payload.currentQuantity).toBe(5);
    });
  });
});
