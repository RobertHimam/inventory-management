import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Application } from 'express';
import express from 'express';

import { InventoryRepository } from '../../repositories/InventoryRepository';
import { InventoryController } from '../../controllers/InventoryController';
import { InventoryService } from '../../services/InventoryService';
import { correlationMiddleware } from '../../middleware/correlation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { Role } from '@inventory/shared-types';
import InventoryItem from '../../models/inventory-item.model';

let mongoServer: MongoMemoryServer;
let app: Application;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3002';
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
  process.env.RABBITMQ_EXCHANGE = 'test-exchange';
  process.env.JWT_SECRET = 'test-secret';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.INVENTORY_DB = 'inventory-test';

  const inventoryRepository = new InventoryRepository();
  const inventoryService = new InventoryService(inventoryRepository);
  const inventoryController = new InventoryController(inventoryService);

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

  // Role guard mock for read
  const canRead = (req: any, res: any, next: any) => {
    if (!req.user || (req.user.role !== Role.ADMIN && req.user.role !== Role.USER)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };

  app.get('/api/v1/inventory', canRead, (req, res) =>
    inventoryController.listItems(req, res)
  );

  app.get('/api/v1/inventory/:productId', canRead, (req, res) =>
    inventoryController.getItemDetail(req, res)
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

describe('GET /api/v1/inventory', () => {
  it('should return paginated list of inventory balances', async () => {
    await InventoryItem.create([
      { productId: 'prod-1', sku: 'SKU1', productName: 'iPhone', quantity: 10, reorderLevel: 5 },
      { productId: 'prod-2', sku: 'SKU2', productName: 'MacBook', quantity: 20, reorderLevel: 5 },
    ]);

    const response = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
    });
  });

  it('should support searching by sku or product name', async () => {
    await InventoryItem.create([
      { productId: 'prod-1', sku: 'SKU1', productName: 'iPhone', quantity: 10, reorderLevel: 5 },
      { productId: 'prod-2', sku: 'SKU2', productName: 'MacBook', quantity: 20, reorderLevel: 5 },
    ]);

    const response = await request(app)
      .get('/api/v1/inventory?search=macbook')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].productName).toBe('MacBook');
  });
});

describe('GET /api/v1/inventory/:productId', () => {
  it('should return details of a specific product balance', async () => {
    await InventoryItem.create({
      productId: 'prod-xyz',
      sku: 'SKUXYZ',
      productName: 'iPad',
      quantity: 15,
      reorderLevel: 5,
    });

    const response = await request(app)
      .get('/api/v1/inventory/prod-xyz')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      productId: 'prod-xyz',
      quantity: 15,
    });
  });

  it('should return 404 when product is not in inventory', async () => {
    await request(app)
      .get('/api/v1/inventory/prod-missing')
      .set('Authorization', 'Bearer user-token')
      .expect(404);
  });
});
