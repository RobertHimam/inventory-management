import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Application } from 'express';
import express from 'express';

import { AuditRepository } from '../../repositories/AuditRepository';
import { AuditService } from '../../services/AuditService';
import { AuditController } from '../../controllers/AuditController';
import { correlationMiddleware } from '../../middleware/correlation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { Role, AuditAction } from '@inventory/shared-types';
import AuditLog from '../../models/audit.model';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

let mongoServer: MongoMemoryServer;
let app: Application;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, { dbName: 'audit-test' });

  const repository = new AuditRepository();
  const service = new AuditService(repository, mockLogger);
  const controller = new AuditController(service);

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

  // Fake role guard
  const canRead = (req: any, res: any, next: any) => {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };

  app.get('/api/v1/audit', canRead, (req, res) => controller.listAuditLogs(req, res));

  app.use(errorMiddleware);
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

describe('GET /api/v1/audit', () => {
  it('should retrieve list of audit logs for ADMIN', async () => {
    // Seed some logs
    await AuditLog.create([
      {
        correlationId: 'cid-1',
        userId: 'user-1',
        username: 'userone',
        role: Role.USER,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        resourceId: 'prod-1',
      },
      {
        correlationId: 'cid-2',
        userId: 'admin-1',
        username: 'adminone',
        role: Role.ADMIN,
        action: AuditAction.UPDATE,
        resourceType: 'Product',
        resourceId: 'prod-2',
      },
    ]);

    const response = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it('should forbid access for USER', async () => {
    await request(app)
      .get('/api/v1/audit')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
  });

  it('should filter logs by query parameters', async () => {
    await AuditLog.create([
      {
        correlationId: 'cid-1',
        userId: 'user-1',
        username: 'userone',
        role: Role.USER,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        resourceId: 'prod-1',
      },
      {
        correlationId: 'cid-2',
        userId: 'admin-1',
        username: 'adminone',
        role: Role.ADMIN,
        action: AuditAction.UPDATE,
        resourceType: 'Stock',
        resourceId: 'stock-2',
      },
    ]);

    const response = await request(app)
      .get('/api/v1/audit')
      .query({ resourceType: 'Stock' })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].resourceType).toBe('Stock');
  });
});
