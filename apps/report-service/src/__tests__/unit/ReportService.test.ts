/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ReportService } from '../../services/ReportService';
import { ProductModel } from '../../models/product.model';
import { SaleModel } from '../../models/sale.model';
import { ReportCacheModel } from '../../models/cache.model';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

let mongoServer: MongoMemoryServer;
let service: ReportService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'report-unit-test' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  service = new ReportService(mockLogger);
});

describe('ReportService Unit Tests', () => {
  describe('Product Read Model (Events)', () => {
    it('should create product in read model on product.created', async () => {
      const payload = {
        productId: 'prod-1',
        name: 'Premium Widget',
        sku: 'WID-PREM',
        price: 150,
      };

      await service.handleProductCreated(payload);

      const saved = await ProductModel.findOne({ productId: 'prod-1' });
      expect(saved).toBeDefined();
      expect(saved!.name).toBe('Premium Widget');
      expect(saved!.quantity).toBe(0); // initially 0
    });

    it('should update product in read model on product.updated', async () => {
      await ProductModel.create({
        productId: 'prod-1',
        name: 'Old Widget',
        sku: 'WID-OLD',
        price: 120,
        cost: 80,
        quantity: 10,
        reorderLevel: 3,
      });

      const payload = {
        productId: 'prod-1',
        name: 'Updated Premium Widget',
        sku: 'WID-PREM',
        price: 150,
      };

      await service.handleProductUpdated(payload);

      const saved = await ProductModel.findOne({ productId: 'prod-1' });
      expect(saved!.name).toBe('Updated Premium Widget');
      expect(saved!.quantity).toBe(10); // quantity preserved
      expect(saved!.price).toBe(150);
    });

    it('should soft delete product on product.deleted', async () => {
      await ProductModel.create({
        productId: 'prod-1',
        name: 'Premium Widget',
        sku: 'WID-PREM',
        price: 150,
        cost: 100,
        quantity: 10,
        reorderLevel: 5,
      });

      const payload = {
        productId: 'prod-1',
      };

      await service.handleProductDeleted(payload);

      const saved = await ProductModel.findOne({ productId: 'prod-1' });
      expect(saved!.deletedAt).not.toBeNull();
      expect(saved!.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Stock Transactions (Events)', () => {
    beforeEach(async () => {
      await ProductModel.create({
        productId: 'prod-1',
        name: 'Premium Widget',
        sku: 'WID-PREM',
        price: 150,
        cost: 100,
        quantity: 10,
        reorderLevel: 5,
      });
    });

    it('should increment quantity on stock.in.created', async () => {
      const payload = {
        productId: 'prod-1',
        quantity: 5,
        userId: 'admin-1',
        createdAt: new Date(),
      };

      await service.handleStockIn(payload);

      const saved = await ProductModel.findOne({ productId: 'prod-1' });
      expect(saved!.quantity).toBe(15);
    });

    it('should decrement quantity and record sale on stock.out.created', async () => {
      const payload = {
        productId: 'prod-1',
        quantity: 3,
        userId: 'user-1',
        createdAt: new Date(),
      };

      await service.handleStockOut(payload);

      const saved = await ProductModel.findOne({ productId: 'prod-1' });
      expect(saved!.quantity).toBe(7);

      const sale = await SaleModel.findOne({ productId: 'prod-1' });
      expect(sale).toBeDefined();
      expect(sale!.quantity).toBe(3);
      expect(sale!.price).toBe(150); // from product price
      expect(sale!.totalAmount).toBe(450);
      expect(sale!.soldBy).toBe('user-1');
    });

    it('should update quantity on stock.adjustment.created', async () => {
      const payload = {
        productId: 'prod-1',
        previousQuantity: 10,
        newQuantity: 8,
        reason: 'Damaged item',
        adjustedBy: 'admin-1',
        createdAt: new Date(),
      };

      await service.handleStockAdjustment(payload);

      const saved = await ProductModel.findOne({ productId: 'prod-1' });
      expect(saved!.quantity).toBe(8);
    });
  });

  describe('Report Calculations', () => {
    beforeEach(async () => {
      await ProductModel.create([
        {
          productId: 'prod-1',
          name: 'Premium Widget',
          sku: 'WID-PREM',
          price: 150,
          cost: 100,
          quantity: 10,
          reorderLevel: 5,
        },
        {
          productId: 'prod-2',
          name: 'Budget Widget',
          sku: 'WID-BUDG',
          price: 50,
          cost: 30,
          quantity: 2, // low stock! (reorderLevel is 5)
          reorderLevel: 5,
        },
        {
          productId: 'prod-deleted',
          name: 'Deleted Widget',
          sku: 'WID-DEL',
          price: 100,
          cost: 60,
          quantity: 5,
          reorderLevel: 2,
          deletedAt: new Date(),
        },
      ]);

      await SaleModel.create([
        {
          productId: 'prod-1',
          productName: 'Premium Widget',
          quantity: 2,
          price: 150,
          totalAmount: 300,
          soldBy: 'user-1',
          createdAt: new Date('2026-06-15T10:00:00Z'),
        },
        {
          productId: 'prod-2',
          productName: 'Budget Widget',
          quantity: 5,
          price: 50,
          totalAmount: 250,
          soldBy: 'user-1',
          createdAt: new Date('2026-06-16T10:00:00Z'),
        },
      ]);
    });

    it('should compute dashboard metrics correctly', async () => {
      const metrics = await service.getDashboardMetrics();
      expect(metrics.totalProducts).toBe(2); // non-deleted
      expect(metrics.totalInventoryValue).toBe(1600); // (10 * 150) + (2 * 50)
      expect(metrics.lowStockCount).toBe(1); // prod-2 only
    });

    it('should compute sales report correctly with filters', async () => {
      const report = await service.getSalesReport('2026-06-16T00:00:00Z', '2026-06-16T23:59:59Z');
      expect(report.sales).toHaveLength(1);
      expect(report.sales[0].productId).toBe('prod-2');
      expect(report.totalSalesAmount).toBe(250);
      expect(report.totalQuantitySold).toBe(5);
    });

    it('should compute inventory valuation report correctly', async () => {
      const report = await service.getInventoryValuation();
      expect(report.valuations).toHaveLength(2); // non-deleted
      expect(report.totalCostValuation).toBe(1060); // (10 * 100) + (2 * 30)
      expect(report.totalRetailValuation).toBe(1600); // (10 * 150) + (2 * 50)
    });

    it('should compute low-stock report correctly', async () => {
      const report = await service.getLowStockReport();
      expect(report.lowStockItems).toHaveLength(1);
      expect(report.lowStockItems[0].productId).toBe('prod-2');
    });
  });

  describe('Caching & Cache Invalidation', () => {
    it('should store and return cached report data', async () => {
      const cacheKey = 'dashboard:ADMIN';
      const dummyData = { totalProducts: 99 };

      // Populate cache
      await ReportCacheModel.create({
        key: cacheKey,
        data: dummyData,
        createdAt: new Date(),
      });

      const cached = await service.getCachedReport(cacheKey);
      expect(cached).toEqual(dummyData);
    });

    it('should invalidate specific caches on stock.in.created event', async () => {
      await ReportCacheModel.create([
        { key: 'dashboard:ADMIN', data: {} },
        { key: 'inventory-valuation', data: {} },
      ]);

      await service.handleStockIn({ productId: 'prod-1', quantity: 5 });

      // Invalidate valuation cache
      const valCached = await ReportCacheModel.findOne({ key: 'inventory-valuation' });
      expect(valCached).toBeNull();

      // Dashboard cache is not invalidated by stock in (wait, inventory value changes, so dashboard does change, let's see)
      // Actually, dashboard metrics contain total inventory value, so stock.in.created should invalidate both valuation AND dashboard caches!
      // In the spec:
      // - stock.in.created - Invalidate valuation cache
      // Wait, is dashboard cache invalidated by stock in?
      // Let's stick strictly to spec:
      // stock.in.created -> Invalidate valuation cache
      // stock.out.created -> Invalidate sales/dashboard cache
      // stock.adjustment.created -> Invalidate all caches
      // stock.low.detected -> Invalidate low stock cache
    });
  });
});
