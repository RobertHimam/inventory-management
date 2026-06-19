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

  // Build app manually
  const productRepository = new ProductRepository();
  const productService = new ProductService(productRepository);
  const productController = new ProductController(productService);

  app = express();
  app.use(correlationMiddleware);
  app.use(express.json());
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

describe('POST /api/v1/products', () => {
  it('should create a product with valid data', async () => {
    const productData = {
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      sku: 'TEST123',
      category: 'Electronics',
      stockQuantity: 10,
      isActive: true,
    };

    const response = await request(app)
      .post('/api/v1/products')
      .send(productData);
    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: productData.name,
      price: productData.price,
      sku: productData.sku,
      category: productData.category,
      stockQuantity: productData.stockQuantity,
      isActive: productData.isActive,
    });
    expect(response.body.data._id).toBeDefined();
  });

  it('should return 409 when SKU already exists', async () => {
    const productData = {
      name: 'Test Product',
      price: 50.0,
      sku: 'EXISTING123',
      category: 'Clothing',
      stockQuantity: 5,
    };

    await request(app).post('/api/v1/products').send(productData).expect(201);

    const response = await request(app)
      .post('/api/v1/products')
      .send(productData)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('already exists');
  });

  it('should return 400 for invalid data', async () => {
    const invalidData = {
      name: '',
      price: -10,
      sku: '',
      category: '',
      stockQuantity: -5,
    };

    const response = await request(app)
      .post('/api/v1/products')
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const incompleteData = {
      name: 'Partial Product',
    };

    const response = await request(app)
      .post('/api/v1/products')
      .send(incompleteData)
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
