import { User, Product, Category, Supplier, Role } from '../src';

describe('Soft Delete', () => {
  it('User should include deletedAt and deletedBy', () => {
    const deletedAt = new Date();
    const user: User = {
      id: 'u1',
      email: 'deleted@example.com',
      username: 'deleteduser',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt,
      deletedBy: 'admin',
    };
    expect(user.deletedAt).toBe(deletedAt);
    expect(user.deletedBy).toBe('admin');
  });

  it('Product should include deletedAt and deletedBy', () => {
    const deletedAt = new Date();
    const product: Product = {
      _id: 'p1',
      name: 'Deleted Product',
      sku: 'DEL-001',
      category: 'Electronics',
      price: 10,
      stockQuantity: 0,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt,
      deletedBy: 'admin',
    };
    expect(product.deletedAt).toBe(deletedAt);
    expect(product.deletedBy).toBe('admin');
  });

  it('Category should include deletedAt and deletedBy', () => {
    const deletedAt = new Date();
    const category: Category = {
      id: 'c1',
      name: 'Deleted Category',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt,
      deletedBy: 'admin',
    };
    expect(category.deletedAt).toBe(deletedAt);
    expect(category.deletedBy).toBe('admin');
  });

  it('Supplier should include deletedAt and deletedBy', () => {
    const deletedAt = new Date();
    const supplier: Supplier = {
      id: 's1',
      name: 'Deleted Supplier',
      contactEmail: 'deleted@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt,
      deletedBy: 'admin',
    };
    expect(supplier.deletedAt).toBe(deletedAt);
    expect(supplier.deletedBy).toBe('admin');
  });
});
