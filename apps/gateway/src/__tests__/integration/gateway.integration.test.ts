process.env.NODE_ENV = 'test';
process.env.PORT = '8011';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';
process.env.RABBITMQ_URL = 'amqp://localhost';
process.env.MONGODB_URI = 'mongodb://localhost:27017/gateway-test';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_AUTH_MAX = '10';
process.env.SSE_ENABLED = 'true';
process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:8020';
process.env.PRODUCT_SERVICE_URL = 'http://127.0.0.1:8021';
process.env.REPORT_SERVICE_URL = 'http://127.0.0.1:8022';
process.env.INVENTORY_SERVICE_URL = 'http://127.0.0.1:9001';
process.env.NOTIFICATION_SERVICE_URL = 'http://127.0.0.1:9002';
process.env.AUDIT_SERVICE_URL = 'http://127.0.0.1:9003';
process.env.SSE_SERVICE_URL = 'http://127.0.0.1:9004';

import request from 'supertest';
import { createServer, Server } from 'http';
import express, { Application } from 'express';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { createApp } from '../../app';

describe('API Gateway Integration Tests', () => {
  const jwtSecret = 'gateway-secret';
  let app: Application;
  let mockAuthService: Server;
  let mockProductService: Server;
  let mockReportService: Server;

  beforeAll((done) => {
    // Start mock backend services on pre-declared static ports
    const authExpress = express();
    authExpress.post('/auth/login', (_req, res) => {
      res.status(200).json({ success: true, token: 'mock-token' });
    });
    mockAuthService = createServer(authExpress).listen(8020, () => {
      const prodExpress = express();
      prodExpress.get('/products/:id', (req, res) => {
        res.status(200).json({ success: true, productId: req.params.id, correlationHeader: req.headers['x-correlation-id'] });
      });
      prodExpress.post('/products', (_req, res) => {
        res.status(201).json({ success: true, created: true });
      });
      mockProductService = createServer(prodExpress).listen(8021, () => {
        const reportExpress = express();
        reportExpress.get('/reports/dashboard', (_req, res) => {
          res.status(200).json({ success: true, report: 'dashboard' });
        });
        reportExpress.get('/reports/sales', (_req, res) => {
          res.status(200).json({ success: true, report: 'sales' });
        });
        mockReportService = createServer(reportExpress).listen(8022, () => {
          app = createApp(jwtSecret);
          done();
        });
      });
    });
  });

  afterAll((done) => {
    mockAuthService.close(() => {
      mockProductService.close(() => {
        mockReportService.close(() => {
          done();
        });
      });
    });
  });

  describe('GET /health', () => {
    it('should return 200 health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('OK');
    });
  });

  describe('Correlation ID Middleware', () => {
    it('should generate X-Correlation-ID when not supplied', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('should preserve X-Correlation-ID when supplied by client', async () => {
      const testCid = 'client-cid-123';
      const res = await request(app)
        .get('/health')
        .set('X-Correlation-ID', testCid)
        .expect(200);

      expect(res.headers['x-correlation-id']).toBe(testCid);
    });
  });

  describe('CORS Headers', () => {
    it('should include correct CORS headers', async () => {
      const res = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(204);

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Reverse Proxy & JWT Validation', () => {
    it('should allow /auth/login without JWT validation', async () => {
      const res = await request(app)
        .post('/auth/login')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('mock-token');
    });

    it('should block protected paths without token', async () => {
      await request(app)
        .get('/products/123')
        .expect(401);
    });

    it('should block protected paths with invalid token', async () => {
      await request(app)
        .get('/products/123')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow and proxy protected paths with valid token', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      const res = await request(app)
        .get('/products/123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.productId).toBe('123');
      expect(res.body.correlationHeader).toBeDefined(); // Forwards Correlation ID
    });
  });

  describe('RBAC Validation', () => {
    it('should allow USER to read products and dashboard reports', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await request(app)
        .get('/products/123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should block USER from mutating products (e.g. POST)', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should block USER from sales reports', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await request(app)
        .get('/reports/sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow ADMIN to mutate products and read sales reports', async () => {
      const token = createAccessToken({ sub: 'admin-123', role: Role.ADMIN }, jwtSecret);

      await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app)
        .get('/reports/sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce auth rate limits on auth routes', async () => {
      const requestsBatch = [];
      // 10 is max requests per window for auth, let's make 12 requests
      for (let i = 0; i < 12; i++) {
        requestsBatch.push(
          request(app)
            .post('/auth/login')
        );
      }

      const results = await Promise.all(requestsBatch);
      const statuses = results.map(r => r.status);
      expect(statuses).toContain(429);
    });
  });
});
