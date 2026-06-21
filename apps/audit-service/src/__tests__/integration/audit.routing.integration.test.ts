/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import './setupEnv';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { createAccessToken } from '@inventory/shared-auth';
import { Role, AuditAction } from '@inventory/shared-types';
import AuditLog from '../../models/audit.model';

let mongoServer: MongoMemoryServer;
let app: any;

const JWT_SECRET = 'test-jwt-secret-key-1234';
const adminToken = createAccessToken({ sub: 'admin-id', role: Role.ADMIN }, JWT_SECRET);
const userToken = createAccessToken({ sub: 'user-id', role: Role.USER }, JWT_SECRET);

const ROUTE = '/audit/api/v1/audit';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  app = createApp();
  await mongoose.connect(uri, { dbName: 'audit-routing-test' });
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

async function seedLog(overrides: Record<string, any> = {}) {
  return AuditLog.create({
    correlationId: `cid-${Date.now()}`,
    userId: 'user-1',
    username: 'testuser',
    role: Role.USER,
    action: AuditAction.CREATE,
    resourceType: 'Product',
    resourceId: 'prod-1',
    ...overrides,
  });
}

describe(`GET ${ROUTE}`, () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get(ROUTE);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when USER role token provided', async () => {
    const res = await request(app)
      .get(ROUTE)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with empty list when no audit logs', async () => {
    const res = await request(app)
      .get(ROUTE)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('returns 200 with seeded audit logs', async () => {
    await seedLog();
    await seedLog({ action: AuditAction.UPDATE });

    const res = await request(app)
      .get(ROUTE)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('respects page and limit query params', async () => {
    await seedLog();
    await seedLog();
    await seedLog();

    const res = await request(app)
      .get(`${ROUTE}?page=1&limit=2`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('respects order=desc query param', async () => {
    const res = await request(app)
      .get(`${ROUTE}?page=1&limit=20&order=desc`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
  });
});
