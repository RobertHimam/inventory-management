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
import { idempotency } from '../../middleware/idempotency.middleware';
import IdempotencyKey from '../../models/idempotency.model';
import Product from '../../models/product.model';

let mongoServer: MongoMemoryServer;
let app: Application;
let productController: ProductController;

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
  productController = new ProductController(productService);

  app = express();
  app.use(correlationMiddleware);
  app.use(express.json());
  
  // Apply idempotency middleware on POST /api/v1/products
  app.post('/api/v1/products', idempotency, (req, res, next) => productController.createProduct(req, res, next));
  
  // Dummy endpoint to trigger server error (500) for testing retry logic
  app.post('/api/v1/fail', idempotency, (req, res) => {
    res.status(500).json({ success: false, error: 'Simulated server error' });
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

describe('Idempotency Middleware Integration Tests', () => {
  const productData = {
    name: 'Idempotent Product',
    description: 'A test product for idempotency',
    price: 49.99,
    sku: 'IDEMP123',
    category: 'Books',
    stockQuantity: 100,
    isActive: true,
  };

  it('should return 400 when Idempotency-Key header is missing', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .send(productData);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Idempotency-Key header is required');
  });

  it('should return 400 when Idempotency-Key header is empty', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', '  ')
      .send(productData);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Idempotency-Key header cannot be empty');
  });

  it('should create a product successfully on the first request with a valid key', async () => {
    const key = 'unique-key-1';
    const response = await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', key)
      .send(productData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    // Verify key was stored as completed
    const record = await IdempotencyKey.findOne({ key });
    expect(record).toBeDefined();
    expect(record?.status).toBe('completed');
    expect(record?.responseCode).toBe(201);
    expect(record?.responseBody.data.sku).toBe(productData.sku);
  });

  it('should return the cached response and not duplicate creation on the second request with the same key', async () => {
    const key = 'unique-key-2';
    
    // First request
    const response1 = await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', key)
      .send(productData);
    expect(response1.status).toBe(201);

    // Second request
    const response2 = await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', key)
      .send(productData);
    expect(response2.status).toBe(201);
    expect(response2.body).toEqual(response1.body);

    // Verify only one product exists in the DB
    const count = await Product.countDocuments({ sku: productData.sku });
    expect(count).toBe(1);
  });

  it('should return 400 when the same key is reused with a different request body', async () => {
    const key = 'unique-key-3';
    
    // First request
    await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', key)
      .send(productData);

    // Second request with altered payload
    const alteredProductData = { ...productData, name: 'Altered Product Name' };
    const response = await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', key)
      .send(alteredProductData);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('used for a different request payload');
  });

  it('should return 409 when a concurrent request with the same key is in progress', async () => {
    const key = 'unique-key-4';

    // Insert a record with status 'processing' manually to simulate in-progress
    await IdempotencyKey.create({
      key,
      endpoint: 'POST /api/v1/products',
      requestHash: 'some-hash',
      status: 'processing',
    });

    const response = await request(app)
      .post('/api/v1/products')
      .set('Idempotency-Key', key)
      .send(productData);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('already in progress');
  });

  it('should delete key and allow retry if original request results in 500 server error', async () => {
    const key = 'unique-key-5';

    // Call endpoint that fails with 500
    const response1 = await request(app)
      .post('/api/v1/fail')
      .set('Idempotency-Key', key)
      .send(productData);
    expect(response1.status).toBe(500);

    // Wait slightly to ensure asynchronous delete completes
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify key was deleted
    const record = await IdempotencyKey.findOne({ key });
    expect(record).toBeNull();

    // Call it again (should succeed/run again, here it will return 500 again since it is hardcoded, but verifies it doesn't get blocked with 409 or return cached response)
    const response2 = await request(app)
      .post('/api/v1/fail')
      .set('Idempotency-Key', key)
      .send(productData);
    expect(response2.status).toBe(500);
  });
});
