// @ts-nocheck
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Application } from 'express';
import express from 'express';

import { ProductRepository } from '../../repositories/ProductRepository';
import { ProductController } from '../../controllers/ProductController';
import { ProductService } from '../../services/ProductService';
import { correlationMiddleware } from '../../middleware/correlation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';

let mongoServer: MongoMemoryServer;
let app: Application;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
  process.env.RABBITMQ_EXCHANGE = 'test-exchange';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.PRODUCT_DB = 'product-test';

  const productRepository = new ProductRepository();
  const productService = new ProductService(productRepository);
  const productController = new ProductController(productService);

  app = express();
  app.use(correlationMiddleware);
  app.use(express.json());
  
  // Setup route with simulated user for deletedBy field validation
  app.post('/api/v1/products', (req, res, next) => productController.createProduct(req, res, next));
  app.delete('/api/v1/products/:id', (req, res, next) => {
    (req as any).user = { userId: 'test-admin-id', role: 'ADMIN' };
    productController.deleteProduct(req, res, next);
  });
  
  app.use(errorMiddleware);

  await mongoose.connect(uri, { dbName: 'product-test' });
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

describe('DELETE /api/v1/products/:id', () => {
  it('should soft delete a product successfully', async () => {
    // 1. Create product
    const productData = {
      name: 'Item to Delete',
      price: 15.50,
      sku: 'DEL001',
      category: 'TestCat',
      stockQuantity: 20,
      isActive: true,
    };
    const createRes = await request(app)
      .post('/api/v1/products')
      .send(productData)
      .expect(201);

    const productId = createRes.body.data._id;

    // 2. Delete product
    const deleteRes = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .expect(200);

    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data._id).toBe(productId);
    expect(deleteRes.body.data.deletedAt).toBeDefined();
    expect(deleteRes.body.data.deletedBy).toBe('test-admin-id');

    // 3. Verify in database
    const dbProduct = await mongoose.model('Product').findById(productId).exec();
    expect(dbProduct).not.toBeNull();
    expect(dbProduct.deletedAt).not.toBeNull();
    expect(dbProduct.deletedBy).toBe('test-admin-id');
  });

  it('should return 404 when product is not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .delete(`/api/v1/products/${nonExistentId}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });
});
