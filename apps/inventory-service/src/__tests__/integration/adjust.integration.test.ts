import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Application } from 'express';
import express from 'express';

import { InventoryRepository } from '../../repositories/InventoryRepository';
import { StockAdjustmentController } from '../../controllers/StockAdjustmentController';
import { StockAdjustmentService } from '../../services/StockAdjustmentService';
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
  const stockAdjustmentService = new StockAdjustmentService(inventoryRepository);
  const stockAdjustmentController = new StockAdjustmentController(stockAdjustmentService);

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

  app.post('/api/v1/inventory/adjust', canWrite, idempotency, (req, res) =>
    stockAdjustmentController.adjustStock(req, res)
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

describe('POST /api/v1/inventory/adjust', () => {
  it('should adjust stock level with valid data and sufficient stock when authenticated as ADMIN', async () => {
    const productId = 'prod-xyz';

    // Seed inventory item with quantity = 20
    await InventoryItem.create({
      productId,
      quantity: 20,
      reorderLevel: 5,
    });

    const payload = {
      productId,
      quantity: -5, // subtract 5
      reason: 'Damaged items found',
    };

    const response = await request(app)
      .post('/api/v1/inventory/adjust')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'test-adj-key-1')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      productId,
      quantity: -5,
      previousQuantity: 20,
      newQuantity: 15,
      reason: 'Damaged items found',
      adjustedBy: 'admin-1',
    });

    // Verify inventory item is updated: 20 - 5 = 15
    const invItem = await InventoryItem.findOne({ productId });
    expect(invItem?.quantity).toBe(15);
  });

  it('should return 400 when adjustment makes inventory negative', async () => {
    const productId = 'prod-xyz';

    await InventoryItem.create({
      productId,
      quantity: 10,
      reorderLevel: 5,
    });

    const payload = {
      productId,
      quantity: -15, // subtract 15 (results in -5)
      reason: 'Write off',
    };

    const response = await request(app)
      .post('/api/v1/inventory/adjust')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'test-adj-key-2')
      .send(payload)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('negative stock');
  });

  it('should return 403 when authenticated as USER', async () => {
    const payload = {
      productId: 'prod-xyz',
      quantity: 5,
      reason: 'Adjusting as USER',
    };

    await request(app)
      .post('/api/v1/inventory/adjust')
      .set('Authorization', 'Bearer user-token')
      .set('Idempotency-Key', 'test-adj-key-3')
      .send(payload)
      .expect(403);
  });
});
