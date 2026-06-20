/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import './setupEnv';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';

let mongoServer: MongoMemoryServer;
let app: any;

const JWT_SECRET = 'test-auth-secret-key-1234';

// Tokens for RBAC
const adminToken = createAccessToken({ sub: 'admin-user', role: Role.ADMIN }, JWT_SECRET);
const userToken = createAccessToken({ sub: 'read-user', role: Role.USER }, JWT_SECRET);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.PRODUCT_DB = 'category-integration-test';

  app = createApp();

  await mongoose.connect(uri, { dbName: 'category-integration-test' });
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

// ---------------------------------------------------------------------------
// Helper: create a category directly via HTTP
// ---------------------------------------------------------------------------
async function createCategory(name: string, description?: string) {
  const body: Record<string, string> = { name };
  if (description) body.description = description;

  return request(app)
    .post('/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body);
}

// ===========================================================================
// List categories — GET /categories
// ===========================================================================
describe('GET /categories', () => {
  it('returns 200 with empty list when no categories exist', async () => {
    const res = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('returns 200 with seeded categories', async () => {
    await createCategory('Electronics');
    await createCategory('Clothing');

    const res = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('excludes soft-deleted categories from listing', async () => {
    const created = await createCategory('ToDelete');
    const id = created.body.data._id;

    await request(app)
      .delete(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('supports search by name (case-insensitive)', async () => {
    await createCategory('Electronics');
    await createCategory('Clothing');

    const res = await request(app)
      .get('/categories?search=elec')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Electronics');
  });

  it('supports pagination with page and limit', async () => {
    await createCategory('Cat A');
    await createCategory('Cat B');
    await createCategory('Cat C');

    const res = await request(app)
      .get('/categories?page=1&limit=2')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/categories');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ===========================================================================
// Create category — POST /categories
// ===========================================================================
describe('POST /categories', () => {
  it('returns 201 with the created category for valid data', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', description: 'Consumer electronics' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Electronics');
    expect(res.body.data.description).toBe('Consumer electronics');
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.deletedAt).toBeNull();
  });

  it('returns 201 with name-only (description optional)', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Furniture' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Furniture');
  });

  it('returns 400 when name is empty', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'No name provided' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when category with same name already exists', async () => {
    await createCategory('Electronics');

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ name: 'Gadgets' });

    expect(res.status).toBe(401);
  });

  it('returns 403 when a USER (non-admin) tries to create', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Gadgets' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ===========================================================================
// Get category by ID — GET /categories/:id
// ===========================================================================
describe('GET /categories/:id', () => {
  it('returns 200 with the category when found', async () => {
    const created = await createCategory('Electronics');
    const id = created.body.data._id;

    const res = await request(app)
      .get(`/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(id);
    expect(res.body.data.name).toBe('Electronics');
  });

  it('returns 404 when category ID does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/categories/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for a soft-deleted category', async () => {
    const created = await createCategory('Deletable');
    const id = created.body.data._id;

    await request(app)
      .delete(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without a token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/categories/${fakeId}`);
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// Update category — PUT /categories/:id
// ===========================================================================
describe('PUT /categories/:id', () => {
  it('returns 200 with the updated category for valid data', async () => {
    const created = await createCategory('Old Name');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Name', description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.description).toBe('Updated description');
  });

  it('returns 404 when category ID does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/categories/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Anything' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when new name already exists on another category', async () => {
    const cat1 = await createCategory('Electronics');
    const cat2 = await createCategory('Clothing');
    const id = cat2.body.data._id;

    const res = await request(app)
      .put(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    // suppress unused variable lint
    void cat1;
  });

  it('returns 200 when updating to the same name (no conflict)', async () => {
    const created = await createCategory('Electronics');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', description: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Electronics');
  });

  it('returns 401 without a token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/categories/${fakeId}`)
      .send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when a USER tries to update', async () => {
    const created = await createCategory('Electronics');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ===========================================================================
// Delete category — DELETE /categories/:id
// ===========================================================================
describe('DELETE /categories/:id', () => {
  it('returns 200 and soft-deletes the category', async () => {
    const created = await createCategory('Electronics');
    const id = created.body.data._id;

    const res = await request(app)
      .delete(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('category is no longer visible after soft-delete', async () => {
    const created = await createCategory('Transient');
    const id = created.body.data._id;

    await request(app)
      .delete(`/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const getRes = await request(app)
      .get(`/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(404);
  });

  it('returns 404 when category does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/categories/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without a token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/categories/${fakeId}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when a USER tries to delete', async () => {
    const created = await createCategory('Protected');
    const id = created.body.data._id;

    const res = await request(app)
      .delete(`/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
