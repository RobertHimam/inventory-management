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
  app.put('/api/v1/products/:id', (req, res, next) => productController.updateProduct(req, res, next));
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

describe('PUT /api/v1/products/:id', () => {
  it('should update a product successfully', async () => {
    // Create a product first
    const initialData = {
      name: 'Original',
      price: 50,
      sku: 'ORIG001',
      category: 'Cat1',
      stockQuantity: 10,
      isActive: true,
    };
    const createRes = await request(app).post('/api/v1/products').send(initialData);
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data._id;

    // Update product
    const updateData = {
      name: 'Updated Name',
      price: 75.99,
    };
    const response = await request(app)
      .put(`/api/v1/products/${productId}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Name');
    expect(response.body.data.price).toBe(75.99);
    expect(response.body.data._id).toBe(productId);
  });

  it('should return 404 when product not found', async () => {
    const nonExistentId = '123456789012345678901234';
    const updateData = { name: 'Update' };

    const response = await request(app)
      .put(`/api/v1/products/${nonExistentId}`)
      .send(updateData)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  it('should return 409 when updating to an existing SKU', async () => {
    // Create two products
    const product1 = {
      name: 'Product 1',
      price: 10,
      sku: 'SKU1',
      category: 'Cat',
      stockQuantity: 1,
    };
    const product2 = {
      name: 'Product 2',
      price: 20,
      sku: 'SKU2',
      category: 'Cat',
      stockQuantity: 2,
    };
    const res1 = await request(app).post('/api/v1/products').send(product1);
    expect(res1.status).toBe(201);
    const id1 = res1.body.data._id;

    const res2 = await request(app).post('/api/v1/products').send(product2);
    expect(res2.status).toBe(201);
    const id2 = res2.body.data._id;

    // Try to update product2's SKU to product1's SKU
    const updateData = { sku: 'SKU1' };
    const response = await request(app)
      .put(`/api/v1/products/${id2}`)
      .send(updateData)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('already exists');
  });

  it('should return 400 for invalid data', async () => {
    // Create a product first
    const createRes = await request(app).post('/api/v1/products').send({
      name: 'Test',
      price: 10,
      sku: 'TEST001',
      category: 'Cat',
      stockQuantity: 1,
    });
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data._id;

    // Try to update with invalid data
    const invalidData = { price: -5 };
    const response = await request(app)
      .put(`/api/v1/products/${productId}`)
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('should allow updating SKU to same value (no conflict)', async () => {
    const productData = {
      name: 'Product',
      price: 10,
      sku: 'SAME001',
      category: 'Cat',
      stockQuantity: 1,
    };
    const createRes = await request(app).post('/api/v1/products').send(productData);
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data._id;

    // Update with same SKU
    const updateData = { sku: 'SAME001' };
    const response = await request(app)
      .put(`/api/v1/products/${productId}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.sku).toBe('SAME001');
  });

  it('should handle empty update (no changes)', async () => {
    const productData = {
      name: 'Product',
      price: 10,
      sku: 'EMPTY001',
      category: 'Cat',
      stockQuantity: 1,
    };
    const createRes = await request(app).post('/api/v1/products').send(productData);
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data._id;
    const originalUpdatedAt = createRes.body.data.updatedAt;

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    // Empty update
    const response = await request(app)
      .put(`/api/v1/products/${productId}`)
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    // updatedAt should be updated (different from original)
    expect(response.body.data.updatedAt).not.toBe(originalUpdatedAt);
  });
});
