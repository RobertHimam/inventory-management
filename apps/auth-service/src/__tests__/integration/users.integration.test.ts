/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import './setupEnv';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import UserModel from '../../models/user.model';
import bcrypt from 'bcrypt';

let mongoServer: MongoMemoryServer;
let app: any;

const JWT_SECRET = 'test-jwt-secret-key-1234';
const adminToken = createAccessToken({ sub: 'admin-id', role: Role.ADMIN }, JWT_SECRET);
const userToken = createAccessToken({ sub: 'user-id', role: Role.USER }, JWT_SECRET);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  app = createApp();
  await mongoose.connect(uri, { dbName: 'auth-users-test' });
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

async function seedUser(overrides: Record<string, any> = {}) {
  const passwordHash = await bcrypt.hash('password123', 10);
  return UserModel.create({
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    username: 'testuser',
    passwordHash,
    role: Role.USER,
    ...overrides,
  });
}

describe('GET /users', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when USER role token provided', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with empty list when no users', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('returns 200 with seeded users', async () => {
    await seedUser({ email: 'alice@example.com', username: 'alice' });
    await seedUser({ email: 'bob@example.com', username: 'bob' });

    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('does not return passwordHash in response', async () => {
    await seedUser({ email: 'secure@example.com' });

    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    for (const user of res.body.data) {
      expect(user.passwordHash).toBeUndefined();
    }
  });

  it('excludes soft-deleted users', async () => {
    await seedUser({ email: 'active@example.com' });
    await seedUser({ email: 'deleted@example.com', deletedAt: new Date() });

    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it('respects page and limit query params', async () => {
    await seedUser({ email: 'u1@example.com' });
    await seedUser({ email: 'u2@example.com' });
    await seedUser({ email: 'u3@example.com' });

    const res = await request(app)
      .get('/users?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('returns correct pagination for page 2', async () => {
    await seedUser({ email: 'u1@example.com' });
    await seedUser({ email: 'u2@example.com' });
    await seedUser({ email: 'u3@example.com' });

    const res = await request(app)
      .get('/users?page=2&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});
