/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
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

  app.get('/api/v1/products/:id', (req, res, next) => productController.getProductDetail(req, res, next));
  app.post('/api/v1/products', (req, res, next) => productController.createProduct(req, res, next));
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

describe('GET /api/v1/products/:id', () => {
  it('should retrieve product details successfully', async () => {
    // 1. Create product
    const productData = {
      name: 'iPhone 15 Pro',
      price: 1199,
      sku: 'IPHONE15PRO',
      category: 'Phones',
      stockQuantity: 12,
      isActive: true,
    };
    const createRes = await request(app)
      .post('/api/v1/products')
      .send(productData)
      .expect(201);

    const productId = createRes.body.data._id;

    // 2. Retrieve details
    const getRes = await request(app)
      .get(`/api/v1/products/${productId}`)
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data._id).toBe(productId);
    expect(getRes.body.data.sku).toBe('IPHONE15PRO');
  });

  it('should return 404 when product is not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .get(`/api/v1/products/${nonExistentId}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  it('should return 404 when trying to retrieve a soft-deleted product', async () => {
    // 1. Create product
    const productData = {
      name: 'Item to delete',
      price: 10,
      sku: 'SOON_DELETED',
      category: 'Misc',
      stockQuantity: 10,
    };
    const createRes = await request(app)
      .post('/api/v1/products')
      .send(productData)
      .expect(201);

    const productId = createRes.body.data._id;

    // 2. Manually soft delete the product in DB
    await mongoose.model('Product').findByIdAndUpdate(productId, { deletedAt: new Date() }).exec();

    // 3. Try to retrieve details, should return 404
    const response = await request(app)
      .get(`/api/v1/products/${productId}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });
});
