import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Application } from 'express';
import express from 'express';

import { InventoryRepository } from '../../repositories/InventoryRepository';
import { StockInController } from '../../controllers/StockInController';
import { StockInService } from '../../services/StockInService';
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
  const stockInService = new StockInService(inventoryRepository);
  const stockInController = new StockInController(stockInService);

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

  app.post('/api/v1/inventory/stock-in', canWrite, idempotency, (req, res) =>
    stockInController.stockIn(req, res)
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

describe('POST /api/v1/inventory/stock-in', () => {
  it('should record stock in with valid data when authenticated as ADMIN', async () => {
    const payload = {
      productId: 'prod-abc',
      quantity: 50,
    };

    const response = await request(app)
      .post('/api/v1/inventory/stock-in')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'test-key-1')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      productId: payload.productId,
      quantity: payload.quantity,
      createdBy: 'admin-1',
    });

    // Verify inventory item is updated
    const invItem = await InventoryItem.findOne({ productId: payload.productId });
    expect(invItem).toBeDefined();
    expect(invItem?.quantity).toBe(50);
  });

  it('should return 403 when authenticated as USER', async () => {
    const payload = {
      productId: 'prod-abc',
      quantity: 50,
    };

    await request(app)
      .post('/api/v1/inventory/stock-in')
      .set('Authorization', 'Bearer user-token')
      .set('Idempotency-Key', 'test-key-2')
      .send(payload)
      .expect(403);
  });

  it('should enforce idempotency', async () => {
    const payload = {
      productId: 'prod-abc',
      quantity: 20,
    };

    // First request
    const res1 = await request(app)
      .post('/api/v1/inventory/stock-in')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'idem-key-1')
      .send(payload)
      .expect(201);

    // Second request with same key
    const res2 = await request(app)
      .post('/api/v1/inventory/stock-in')
      .set('Authorization', 'Bearer admin-token')
      .set('Idempotency-Key', 'idem-key-1')
      .send(payload)
      .expect(201);

    expect(res1.body.data.id).toBe(res2.body.data.id);

    // Verify inventory is incremented only once
    const invItem = await InventoryItem.findOne({ productId: payload.productId });
    expect(invItem?.quantity).toBe(20);
  });
});
