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

const adminToken = createAccessToken({ sub: 'admin-user', role: Role.ADMIN }, JWT_SECRET);
const userToken = createAccessToken({ sub: 'read-user', role: Role.USER }, JWT_SECRET);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.PRODUCT_DB = 'supplier-integration-test';

  app = createApp();

  await mongoose.connect(uri, { dbName: 'supplier-integration-test' });
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

async function createSupplier(name: string, extras: Record<string, string> = {}) {
  return request(app)
    .post('/suppliers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name, ...extras });
}

// ===========================================================================
// GET /suppliers
// ===========================================================================
describe('GET /suppliers', () => {
  it('returns 200 with empty list when no suppliers exist', async () => {
    const res = await request(app)
      .get('/suppliers')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('returns 200 with seeded suppliers', async () => {
    await createSupplier('Acme Corp');
    await createSupplier('Global Supplies');

    const res = await request(app)
      .get('/suppliers')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('excludes soft-deleted suppliers', async () => {
    const created = await createSupplier('ToDelete');
    const id = created.body.data._id;

    await request(app)
      .delete(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/suppliers')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('supports search by name (case-insensitive)', async () => {
    await createSupplier('Acme Corp');
    await createSupplier('Global Supplies');

    const res = await request(app)
      .get('/suppliers?search=acme')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Acme Corp');
  });

  it('supports pagination', async () => {
    await createSupplier('Supplier A');
    await createSupplier('Supplier B');
    await createSupplier('Supplier C');

    const res = await request(app)
      .get('/suppliers?page=1&limit=2')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/suppliers');
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// POST /suppliers
// ===========================================================================
describe('POST /suppliers', () => {
  it('returns 201 with created supplier for valid data', async () => {
    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Corp', contactEmail: 'contact@acme.com', phone: '555-1234', address: '123 Main St' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Acme Corp');
    expect(res.body.data.contactEmail).toBe('contact@acme.com');
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.deletedAt).toBeNull();
  });

  it('returns 201 with name-only (all optional fields)', async () => {
    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Minimal Supplier' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Minimal Supplier');
  });

  it('returns 400 when name is empty', async () => {
    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contactEmail: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid contactEmail', async () => {
    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme', contactEmail: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when supplier with same name already exists', async () => {
    await createSupplier('Acme Corp');

    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Corp' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/suppliers').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when USER tries to create', async () => {
    const res = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ===========================================================================
// GET /suppliers/:id
// ===========================================================================
describe('GET /suppliers/:id', () => {
  it('returns 200 with supplier when found', async () => {
    const created = await createSupplier('Acme Corp');
    const id = created.body.data._id;

    const res = await request(app)
      .get(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(id);
    expect(res.body.data.name).toBe('Acme Corp');
  });

  it('returns 404 when ID does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/suppliers/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for soft-deleted supplier', async () => {
    const created = await createSupplier('Deletable');
    const id = created.body.data._id;

    await request(app)
      .delete(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/suppliers/${fakeId}`);
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PUT /suppliers/:id
// ===========================================================================
describe('PUT /suppliers/:id', () => {
  it('returns 200 with updated supplier', async () => {
    const created = await createSupplier('Old Name');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Name', address: 'New Address' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.address).toBe('New Address');
  });

  it('returns 404 when ID does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/suppliers/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Anything' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when new name taken by another supplier', async () => {
    const s1 = await createSupplier('Acme Corp');
    const s2 = await createSupplier('Global Supplies');
    const id = s2.body.data._id;

    const res = await request(app)
      .put(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Corp' });

    expect(res.status).toBe(409);
    void s1;
  });

  it('returns 200 when updating to same name', async () => {
    const created = await createSupplier('Acme Corp');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Corp', address: 'Updated Address' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Acme Corp');
  });

  it('returns 400 for invalid contactEmail on update', async () => {
    const created = await createSupplier('Acme Corp');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contactEmail: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).put(`/suppliers/${fakeId}`).send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when USER tries to update', async () => {
    const created = await createSupplier('Acme Corp');
    const id = created.body.data._id;

    const res = await request(app)
      .put(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// DELETE /suppliers/:id
// ===========================================================================
describe('DELETE /suppliers/:id', () => {
  it('returns 200 and soft-deletes the supplier', async () => {
    const created = await createSupplier('Acme Corp');
    const id = created.body.data._id;

    const res = await request(app)
      .delete(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('supplier not visible after soft-delete', async () => {
    const created = await createSupplier('Transient');
    const id = created.body.data._id;

    await request(app)
      .delete(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const getRes = await request(app)
      .get(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(404);
  });

  it('returns 404 when supplier does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/suppliers/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/suppliers/${fakeId}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when USER tries to delete', async () => {
    const created = await createSupplier('Protected');
    const id = created.body.data._id;

    const res = await request(app)
      .delete(`/suppliers/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});
