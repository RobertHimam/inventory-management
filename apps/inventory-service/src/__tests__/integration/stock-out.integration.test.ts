/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Application } from 'express';
import express from 'express';

import { InventoryRepository } from '../../repositories/InventoryRepository';
import { StockOutController } from '../../controllers/StockOutController';
import { StockOutService } from '../../services/StockOutService';
import { correlationMiddleware } from '../../middleware/correlation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { idempotency } from '../../middleware/idempotency.middleware';
import { Role } from '@inventory/shared-types';
import InventoryItem from '../../models/inventory-item.model';

let mongoServer: MongoMemoryServer;
let app: Application;
const jwtSecret = 'test-secret';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3002';
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
  process.env.RABBITMQ_EXCHANGE = 'test-exchange';
  process.env.JWT_SECRET = jwtSecret;

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.INVENTORY_DB = 'inventory-test';

  const inventoryRepository = new InventoryRepository();
  const stockOutService = new StockOutService(inventoryRepository);
  const stockOutController = new StockOutController(stockOutService);

  app = express();
  app.use(correlationMiddleware);
  app.use(express.json());

  // Fake auth middleware for testing
  app.use((req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token === 'admin-token') {
        (req as any).user = { userId: 'admin-1', role: Role.ADMIN };
      } else if (token === 'user-token') {
        (req as any).user = { userId: 'user-1', role: Role.USER };
      }
    }
    next();
  });

  // Role guard mock for write
  const canWrite = (req: any, res: any, next: any) => {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };

  app.post('/api/v1/inventory/stock-out', canWrite, idempotency, (req, res) =>
    stockOutController.stockOut(req, res)
  );

  app.use(errorMiddleware);

  await mongoose.connect(uri, { dbName: 'inventory-test' });
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

describe('POST /api/v1/inventory/stock-out', () => {
  it('should record stock out with valid data and sufficient stock when authenticated as ADMIN', async () => {
    const productId = 'prod-xyz';

    // Seed inventory item with quantity = 100
    await InventoryItem.create({
      productId,
      quantity: 100,
      reorderLevel: 10,
    });

    const payload = {
      productId,
      quantity: 30,
    };

    const response = await request(app)
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'test-out-key-1')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      productId,
      quantity: 30,
      createdBy: 'admin-1',
    });

    // Verify inventory item is updated: 100 - 30 = 70
    const invItem = await InventoryItem.findOne({ productId });
    expect(invItem?.quantity).toBe(70);
  });

  it('should return 400 when insufficient stock is available', async () => {
    const productId = 'prod-xyz';

    // Seed inventory item with quantity = 10
    await InventoryItem.create({
      productId,
      quantity: 10,
      reorderLevel: 5,
    });

    const payload = {
      productId,
      quantity: 15,
    };

    const response = await request(app)
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'test-out-key-2')
      .send(payload)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Insufficient stock');
  });

  it('should return 403 when authenticated as USER', async () => {
    const payload = {
      productId: 'prod-xyz',
      quantity: 10,
    };

    await request(app)
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', 'Bearer user-token')
      .set('Idempotency-Key', 'test-out-key-3')
      .send(payload)
      .expect(403);
  });

  it('should enforce idempotency', async () => {
    const productId = 'prod-xyz';

    await InventoryItem.create({
      productId,
      quantity: 50,
      reorderLevel: 5,
    });

    const payload = {
      productId,
      quantity: 20,
    };

    // First request
    const res1 = await request(app)
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'idem-out-key-1')
      .send(payload)
      .expect(201);

    // Second request with same key
    const res2 = await request(app)
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'idem-out-key-1')
      .send(payload)
      .expect(201);

    expect(res1.body.data.id).toBe(res2.body.data.id);

    // Verify inventory is decremented only once: 50 - 20 = 30
    const invItem = await InventoryItem.findOne({ productId });
    expect(invItem?.quantity).toBe(30);
  });
});
