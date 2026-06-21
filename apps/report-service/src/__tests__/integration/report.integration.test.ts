/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Application } from 'express';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { createApp } from '../../app';
import { ReportService } from '../../services/ReportService';
import { ProductModel } from '../../models/product.model';
import { SaleModel } from '../../models/sale.model';

const jwtSecret = 'test-secret';
let mongoServer: MongoMemoryServer;
let app: Application;
let service: ReportService;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = jwtSecret;
  process.env.PORT = '8009';
  process.env.REPORT_DB = 'report-test';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'report-integration-test' });

  service = new ReportService(mockLogger);
  app = createApp(service, jwtSecret);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Report Service Integration Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('OK');
    });
  });

  describe('GET /reports/dashboard', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app)
        .get('/reports/dashboard')
        .expect(401);
    });

    it('should return dashboard metrics for USER role', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await ProductModel.create([
        {
          productId: 'p-1',
          name: 'Widget A',
          sku: 'WA',
          price: 10,
          cost: 6,
          quantity: 10,
          reorderLevel: 2,
        },
        {
          productId: 'p-2',
          name: 'Widget B',
          sku: 'WB',
          price: 20,
          cost: 12,
          quantity: 1, // Low stock
          reorderLevel: 5,
        },
      ]);

      const res = await request(app)
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalProducts).toBe(2);
      expect(res.body.data.totalInventoryValue).toBe(120); // (10 * 10) + (1 * 20)
      expect(res.body.data.lowStockCount).toBe(1);
    });
  });

  describe('GET /reports/sales', () => {
    beforeEach(async () => {
      await SaleModel.create([
        {
          productId: 'p-1',
          productName: 'Widget A',
          quantity: 5,
          price: 10,
          totalAmount: 50,
          soldBy: 'user-1',
          createdAt: new Date('2026-06-15T12:00:00Z'),
        },
        {
          productId: 'p-2',
          productName: 'Widget B',
          quantity: 2,
          price: 20,
          totalAmount: 40,
          soldBy: 'user-1',
          createdAt: new Date('2026-06-16T12:00:00Z'),
        },
      ]);
    });

    it('should block USER role (ADMIN only)', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await request(app)
        .get('/reports/sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return sales report for ADMIN role with date filters', async () => {
      const token = createAccessToken({ sub: 'admin-123', role: Role.ADMIN }, jwtSecret);

      const res = await request(app)
        .get('/reports/sales')
        .query({
          startDate: '2026-06-16T00:00:00Z',
          endDate: '2026-06-16T23:59:59Z',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sales).toHaveLength(1);
      expect(res.body.data.sales[0].productId).toBe('p-2');
      expect(res.body.data.totalSalesAmount).toBe(40);
      expect(res.body.data.totalQuantitySold).toBe(2);
    });

    it('should validate date formats in query', async () => {
      const token = createAccessToken({ sub: 'admin-123', role: Role.ADMIN }, jwtSecret);

      await request(app)
        .get('/reports/sales')
        .query({
          startDate: 'invalid-date',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /reports/inventory-valuation', () => {
    it('should block USER role (ADMIN only)', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await request(app)
        .get('/reports/inventory-valuation')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return valuation report for ADMIN', async () => {
      const token = createAccessToken({ sub: 'admin-123', role: Role.ADMIN }, jwtSecret);

      await ProductModel.create([
        {
          productId: 'p-1',
          name: 'Widget A',
          sku: 'WA',
          price: 10,
          cost: 6,
          quantity: 10,
          reorderLevel: 2,
        },
      ]);

      const res = await request(app)
        .get('/reports/inventory-valuation')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCostValuation).toBe(60);
      expect(res.body.data.totalRetailValuation).toBe(100);
      expect(res.body.data.valuations).toHaveLength(1);
      expect(res.body.data.valuations[0].productId).toBe('p-1');
    });
  });

  describe('GET /reports/low-stock', () => {
    it('should return low stock report for USER', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await ProductModel.create([
        {
          productId: 'p-1',
          name: 'Widget A',
          sku: 'WA',
          price: 10,
          cost: 6,
          quantity: 10,
          reorderLevel: 2,
        },
        {
          productId: 'p-2',
          name: 'Widget B',
          sku: 'WB',
          price: 20,
          cost: 12,
          quantity: 1, // Low stock
          reorderLevel: 5,
        },
      ]);

      const res = await request(app)
        .get('/reports/low-stock')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.lowStockItems).toHaveLength(1);
      expect(res.body.data.lowStockItems[0].productId).toBe('p-2');
    });
  });
});
