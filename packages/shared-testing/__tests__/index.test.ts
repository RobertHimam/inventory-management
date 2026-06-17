import {
  productFixture,
  categoryFixture,
  supplierFixture,
  userFixture,
  createProduct,
  createCategory,
  createSupplier,
  createUser,
  MockRepository,
} from '../src';
import { Role } from '@inventory/shared-types';
import { Product, Category, Supplier } from '@inventory/shared-types';

describe('Fixtures', () => {
  it('productFixture has expected fields', () => {
    expect(productFixture).toMatchObject({
      _id: 'prod-1',
      name: 'Widget',
      price: 9.99,
      category: 'General',
    });
  });
  it('categoryFixture has expected fields', () => {
    expect(categoryFixture).toMatchObject({
      id: 'cat-1',
      name: 'General',
    });
  });
  it('supplierFixture has expected fields', () => {
    expect(supplierFixture).toMatchObject({
      id: 'sup-1',
      name: 'Acme Corp',
      contactEmail: 'contact@example.com',
    });
  });
  it('userFixture has expected fields', () => {
    expect(userFixture).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    });
  });
});

describe('Factories', () => {
  it('createProduct generates unique ids', () => {
    const p1 = createProduct();
    const p2 = createProduct();
    expect(p1._id).not.toBe(p2._id);
  });
  it('createProduct applies overrides', () => {
    const p = createProduct({ name: 'Custom', price: 123 });
    expect(p.name).toBe('Custom');
    expect(p.price).toBe(123);
  });
  it('createCategory works', () => {
    const c = createCategory({ name: 'Cat' });
    expect(c.name).toBe('Cat');
    expect(c.id).toBeDefined();
  });
  it('createSupplier works', () => {
    const s = createSupplier({ name: 'Sup' });
    expect(s.name).toBe('Sup');
  });
  it('createUser works', () => {
    const u = createUser({ email: 'test@example.com', role: Role.ADMIN });
    expect(u.email).toBe('test@example.com');
    expect(u.role).toBe(Role.ADMIN);
  });
});

describe('MockRepository', () => {
  it('save and get', () => {
    const repo = new MockRepository<Product>();
    const p = createProduct({ _id: 'p1' });
    repo.save(p);
    expect(repo.get('p1')).toEqual(p);
  });
  it('getAll returns all saved', () => {
    const repo = new MockRepository<Category>();
    repo.save(createCategory({ id: 'c1' }));
    repo.save(createCategory({ id: 'c2' }));
    expect(repo.getAll().length).toBe(2);
  });
  it('delete removes', () => {
    const repo = new MockRepository<Supplier>();
    const s = createSupplier({ id: 's1' });
    repo.save(s);
    expect(repo.delete('s1')).toBe(true);
    expect(repo.get('s1')).toBeUndefined();
    expect(repo.delete('missing')).toBe(false);
  });
});
