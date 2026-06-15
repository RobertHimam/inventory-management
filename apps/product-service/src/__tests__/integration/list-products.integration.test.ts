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

  app.get('/api/v1/products', (req, res, next) => productController.listProducts(req, res, next));
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

describe('GET /api/v1/products', () => {
  beforeEach(async () => {
    // Seed some test products
    const Product = mongoose.model('Product');
    await Product.create([
      { name: 'Apple iPhone 15', price: 999, sku: 'IPHONE15', category: 'Phones', stockQuantity: 10, isActive: true },
      { name: 'Samsung Galaxy S24', price: 899, sku: 'GALAXY24', category: 'Phones', stockQuantity: 15, isActive: true },
      { name: 'Sony WH-1000XM5', price: 399, sku: 'SONYXM5', category: 'Audio', stockQuantity: 8, isActive: true },
      { name: 'MacBook Air M3', price: 1099, sku: 'MACBOOKM3', category: 'Computers', stockQuantity: 5, isActive: true },
      { name: 'Soft Deleted Product', price: 100, sku: 'SOFTDEL', category: 'Misc', stockQuantity: 0, isActive: true, deletedAt: new Date() },
    ]);
  });

  it('should return a list of active products with pagination metadata, excluding soft deleted ones', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(4);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 4,
      totalPages: 1,
    });

    // Verify soft deleted product is excluded
    const names = res.body.data.map(p => p.name);
    expect(names).not.toContain('Soft Deleted Product');
  });

  it('should support limit and page pagination query parameters', async () => {
    const res = await request(app)
      .get('/api/v1/products?page=1&limit=2')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
    });
  });

  it('should support search query parameters matching name or SKU case-insensitively', async () => {
    const res = await request(app)
      .get('/api/v1/products?search=galaxy')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].sku).toBe('GALAXY24');
  });

  it('should support sorting and ordering parameters', async () => {
    const res = await request(app)
      .get('/api/v1/products?sort=price&order=asc')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].sku).toBe('SONYXM5'); // Cheapest is 399
    expect(res.body.data[res.body.data.length - 1].sku).toBe('MACBOOKM3'); // Most expensive is 1099
  });

  it('should return 400 when invalid query parameters are provided', async () => {
    const res = await request(app)
      .get('/api/v1/products?page=-5')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
