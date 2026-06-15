// @ts-nocheck
import './setupEnv';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';

let mongoServer: MongoMemoryServer;
let app: any;
const JWT_SECRET = 'test-auth-secret-key-1234';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3005';
  process.env.MONGODB_URI = 'mongodb://dummy';
  process.env.PRODUCT_DB = 'product-test-auth';
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
  process.env.RABBITMQ_EXCHANGE = 'test-exchange';
  process.env.JWT_SECRET = JWT_SECRET;

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  app = createApp();

  await mongoose.connect(uri, { dbName: 'product-test-auth' });
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

describe('Authorization Rules (RBAC)', () => {
  const adminToken = createAccessToken({ sub: 'admin-123', role: Role.ADMIN }, JWT_SECRET);
  const userToken = createAccessToken({ sub: 'user-123', role: Role.USER }, JWT_SECRET);

  describe('Read Operations (ADMIN and USER allowed)', () => {
    it('should allow USER to list products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow ADMIN to list products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny access if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/products');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Write Operations (ADMIN allowed, USER denied)', () => {
    const productData = {
      name: 'Authenticated Product',
      price: 200,
      sku: 'AUTHPRODUCT1',
      category: 'Gadgets',
      stockQuantity: 10,
    };

    it('should allow ADMIN to create product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should deny USER from creating product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(productData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny USER from updating product', async () => {
      const someId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/products/${someId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ price: 250 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny USER from deleting product', async () => {
      const someId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/products/${someId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
