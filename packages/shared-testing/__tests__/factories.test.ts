import {
  createProduct,
  createCategory,
  createSupplier,
  createUser,
  createInventoryItem,
  createStockIn,
  createStockOut,
  createStockAdjustment,
  productFixture,
  categoryFixture,
  supplierFixture,
  userFixture,
  MockRepository,
} from '../src';

import { Role } from '@inventory/shared-types';
import { Product, Category, Supplier, User } from '@inventory/shared-types';

describe('Factory Functions', () => {
  describe('createProduct', () => {
    it('should create product with default values', () => {
      const product = createProduct();
      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('Unnamed Product');
      expect(product.sku).toBe('UNNAMED');
      expect(product.price).toBe(0);
      expect(product.quantity).toBe(0);
      expect(product.reorderLevel).toBe(0);
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply overrides', () => {
      const product = createProduct({
        name: 'Custom Product',
        price: 99.99,
        quantity: 50,
        id: 'custom-id',
      });
      expect(product.name).toBe('Custom Product');
      expect(product.price).toBe(99.99);
      expect(product.quantity).toBe(50);
      expect(product.id).toBe('custom-id');
    });

    it('should generate unique ids for each call', () => {
      const p1 = createProduct();
      const p2 = createProduct();
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('createCategory', () => {
    it('should create category with default values', () => {
      const category = createCategory();
      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe('Unnamed Category');
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply overrides', () => {
      const category = createCategory({ name: 'Electronics', id: 'cat-123' });
      expect(category.name).toBe('Electronics');
      expect(category.id).toBe('cat-123');
    });
  });

  describe('createSupplier', () => {
    it('should create supplier with default values', () => {
      const supplier = createSupplier();
      expect(supplier).toBeDefined();
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('Unnamed Supplier');
      expect(supplier.contactEmail).toBe('');
      expect(supplier.createdAt).toBeInstanceOf(Date);
      expect(supplier.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply overrides', () => {
      const supplier = createSupplier({ name: 'Acme Corp', contactEmail: 'info@acme.com' });
      expect(supplier.name).toBe('Acme Corp');
      expect(supplier.contactEmail).toBe('info@acme.com');
    });
  });

  describe('createUser', () => {
    it('should create user with default values', () => {
      const user = createUser();
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('user@example.com');
      expect(user.username).toBe('user1');
      expect(user.role).toBe(Role.USER);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply overrides', () => {
      const user = createUser({
        email: 'admin@example.com',
        username: 'admin',
        role: Role.ADMIN,
      });
      expect(user.email).toBe('admin@example.com');
      expect(user.username).toBe('admin');
      expect(user.role).toBe(Role.ADMIN);
    });
  });

  describe('createInventoryItem', () => {
    it('should create inventory item with required fields', () => {
      const item = createInventoryItem({ productId: 'prod-1', quantity: 100 });
      expect(item.productId).toBe('prod-1');
      expect(item.quantity).toBe(100);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('should not include id field', () => {
      const item = createInventoryItem({ productId: 'prod-1', quantity: 50 });
      expect((item as any).id).toBeUndefined();
    });
  });

  describe('createStockIn', () => {
    it('should create stock in record with all fields', () => {
      const stockIn = createStockIn({
        productId: 'prod-1',
        quantity: 50,
        createdBy: 'user-1',
      });
      expect(stockIn.id).toBeDefined();
      expect(stockIn.id!.startsWith('si-')).toBe(true);
      expect(stockIn.productId).toBe('prod-1');
      expect(stockIn.quantity).toBe(50);
      expect(stockIn.createdBy).toBe('user-1');
      expect(stockIn.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('createStockOut', () => {
    it('should create stock out record with all fields', () => {
      const stockOut = createStockOut({
        productId: 'prod-1',
        quantity: 25,
        createdBy: 'user-1',
      });
      expect(stockOut.id).toBeDefined();
      expect(stockOut.id!.startsWith('so-')).toBe(true);
      expect(stockOut.productId).toBe('prod-1');
      expect(stockOut.quantity).toBe(25);
      expect(stockOut.createdBy).toBe('user-1');
      expect(stockOut.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('createStockAdjustment', () => {
    it('should create stock adjustment with all fields', () => {
      const adjustment = createStockAdjustment({
        productId: 'prod-1',
        quantity: 10,
        previousQuantity: 100,
        newQuantity: 110,
        reason: 'Manual correction',
        adjustedBy: 'user-1',
      });
      expect(adjustment.id).toBeDefined();
      expect(adjustment.id!.startsWith('adj-')).toBe(true);
      expect(adjustment.productId).toBe('prod-1');
      expect(adjustment.quantity).toBe(10);
      expect(adjustment.previousQuantity).toBe(100);
      expect(adjustment.newQuantity).toBe(110);
      expect(adjustment.reason).toBe('Manual correction');
      expect(adjustment.adjustedBy).toBe('user-1');
      expect(adjustment.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Fixtures', () => {
    it('productFixture should have valid structure', () => {
      expect(productFixture).toMatchObject({
        id: 'prod-1',
        name: 'Widget',
        sku: 'WGT-001',
        categoryId: 'cat-1',
        supplierId: 'sup-1',
        price: 9.99,
        quantity: 100,
        reorderLevel: 10,
      });
      expect(productFixture.createdAt).toBeInstanceOf(Date);
      expect(productFixture.updatedAt).toBeInstanceOf(Date);
    });

    it('categoryFixture should have valid structure', () => {
      expect(categoryFixture).toMatchObject({
        id: 'cat-1',
        name: 'General',
      });
      expect(categoryFixture.createdAt).toBeInstanceOf(Date);
      expect(categoryFixture.updatedAt).toBeInstanceOf(Date);
    });

    it('supplierFixture should have valid structure', () => {
      expect(supplierFixture).toMatchObject({
        id: 'sup-1',
        name: 'Acme Corp',
        contactEmail: 'contact@example.com',
      });
      expect(supplierFixture.createdAt).toBeInstanceOf(Date);
      expect(supplierFixture.updatedAt).toBeInstanceOf(Date);
    });

    it('userFixture should have valid structure', () => {
      expect(userFixture).toMatchObject({
        id: 'user-1',
        email: 'user@example.com',
        username: 'user1',
        role: Role.USER,
      });
      expect(userFixture.createdAt).toBeInstanceOf(Date);
      expect(userFixture.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('MockRepository', () => {
    it('should save and retrieve entities', () => {
      const repo = new MockRepository<Product>();
      const product = createProduct({ id: 'test-1', name: 'Test Product' });
      repo.save(product);
      expect(repo.get('test-1')).toEqual(product);
    });

    it('should return undefined for non-existent id', () => {
      const repo = new MockRepository<User>();
      expect(repo.get('nonexistent')).toBeUndefined();
    });

    it('should get all saved entities', () => {
      const repo = new MockRepository<Category>();
      repo.save(createCategory({ id: 'c1', name: 'Cat 1' }));
      repo.save(createCategory({ id: 'c2', name: 'Cat 2' }));
      repo.save(createCategory({ id: 'c3', name: 'Cat 3' }));
      const all = repo.getAll();
      expect(all.length).toBe(3);
      expect(all.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
    });

    it('should delete entities', () => {
      const repo = new MockRepository<Supplier>();
      const supplier = createSupplier({ id: 's1', name: 'Supplier 1' });
      repo.save(supplier);
      expect(repo.delete('s1')).toBe(true);
      expect(repo.get('s1')).toBeUndefined();
    });

    it('should return false when deleting non-existent entity', () => {
      const repo = new MockRepository<User>();
      expect(repo.delete('nonexistent')).toBe(false);
    });

    it('should allow updating entities via save with same id', () => {
      const repo = new MockRepository<Product>();
      const p1 = createProduct({ id: 'p1', name: 'Original' });
      repo.save(p1);
      const p2 = createProduct({ id: 'p1', name: 'Updated' });
      repo.save(p2);
      const retrieved = repo.get('p1');
      expect(retrieved?.name).toBe('Updated');
      expect(repo.getAll().length).toBe(1); // Still only one entity
    });
  });
});

describe('Type Safety', () => {
  it('createProduct returns proper Product type', () => {
    const product = createProduct({ name: 'Test', price: 10 });
    // Should be compatible with Product interface from shared-types
    const productFromSharedTypes: Product = product;
    expect(productFromSharedTypes).toBeDefined();
  });

  it('createUser returns proper User type', () => {
    const user = createUser({ email: 'test@test.com', role: Role.ADMIN });
    const userFromSharedTypes: User = user;
    expect(userFromSharedTypes).toBeDefined();
  });

  it('fixtures are compatible with shared-types', () => {
    const prod: Product = productFixture;
    const cat: Category = categoryFixture;
    const sup: Supplier = supplierFixture;
    const usr: User = userFixture;

    expect(prod).toBeDefined();
    expect(cat).toBeDefined();
    expect(sup).toBeDefined();
    expect(usr).toBeDefined();
  });
});
