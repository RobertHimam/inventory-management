import { nanoid } from 'nanoid';
import {
  Product,
  Category,
  Supplier,
  User,
  CreateProductDto,
  Role,
  InventoryItem,
  StockIn,
  StockOut,
  StockAdjustment,
} from '@inventory/shared-types';

// Fixtures - static test data
export const productFixture: Product = {
  id: 'prod-1',
  name: 'Widget',
  sku: 'WGT-001',
  categoryId: 'cat-1',
  supplierId: 'sup-1',
  price: 9.99,
  quantity: 100,
  reorderLevel: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
};

export const categoryFixture: Category = {
  id: 'cat-1',
  name: 'General',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
};

export const supplierFixture: Supplier = {
  id: 'sup-1',
  name: 'Acme Corp',
  contactEmail: 'contact@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
};

export const userFixture: User = {
  id: 'user-1',
  email: 'user@example.com',
  username: 'user1',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
};

// Helper to create base entity with timestamps
const createBaseEntity = <
  T extends { createdAt: Date; updatedAt: Date; deletedAt: Date | null; deletedBy: string | null },
>(
  base: T,
  overrides?: Partial<T>
): T => {
  const now = new Date();
  const merged = {
    ...base,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
  return merged;
};

// Factory Functions

export function createProduct(overrides?: Partial<CreateProductDto> & Partial<Product>): Product {
  const base: Product = {
    id: nanoid(),
    name: 'Unnamed Product',
    sku: 'UNNAMED',
    categoryId: '',
    supplierId: '',
    price: 0,
    quantity: 0,
    reorderLevel: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
  };
  return createBaseEntity(base, overrides);
}

export function createCategory(overrides?: Partial<Category>): Category {
  const base: Category = {
    id: nanoid(),
    name: 'Unnamed Category',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
  };
  return createBaseEntity(base, overrides);
}

export function createSupplier(overrides?: Partial<Supplier>): Supplier {
  const base: Supplier = {
    id: nanoid(),
    name: 'Unnamed Supplier',
    contactEmail: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
  };
  return createBaseEntity(base, overrides);
}

export function createUser(overrides?: Partial<User>): User {
  const base: User = {
    id: nanoid(),
    email: 'user@example.com',
    username: 'user1',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
  };
  return createBaseEntity(base, overrides);
}

// Inventory specific factories (these don't have soft delete fields)

export function createInventoryItem(data: {
  productId: string;
  quantity: number;
  overrides?: Partial<InventoryItem>;
}): InventoryItem {
  const base: InventoryItem = {
    productId: data.productId,
    quantity: data.quantity,
    updatedAt: new Date(),
    ...data.overrides,
  };
  return base;
}

export function createStockIn(data: {
  productId: string;
  quantity: number;
  createdBy: string;
  overrides?: Partial<StockIn>;
}): StockIn {
  const base: StockIn = {
    id: `si-${nanoid()}`,
    productId: data.productId,
    quantity: data.quantity,
    createdAt: new Date(),
    createdBy: data.createdBy,
    ...data.overrides,
  };
  return base;
}

export function createStockOut(data: {
  productId: string;
  quantity: number;
  createdBy: string;
  overrides?: Partial<StockOut>;
}): StockOut {
  const base: StockOut = {
    id: `so-${nanoid()}`,
    productId: data.productId,
    quantity: data.quantity,
    createdAt: new Date(),
    createdBy: data.createdBy,
    ...data.overrides,
  };
  return base;
}

export function createStockAdjustment(data: {
  productId: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
  overrides?: Partial<StockAdjustment>;
}): StockAdjustment {
  const base: StockAdjustment = {
    id: `adj-${nanoid()}`,
    productId: data.productId,
    quantity: data.quantity,
    previousQuantity: data.previousQuantity,
    newQuantity: data.newQuantity,
    reason: data.reason,
    adjustedBy: data.adjustedBy,
    createdAt: new Date(),
    ...data.overrides,
  };
  return base;
}

// Mock Repository - in-memory data store for testing
export class MockRepository<T extends { id: string }> {
  private items: Map<string, T> = new Map();

  clear(): void {
    this.items.clear();
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  save(entity: T): T {
    this.items.set(entity.id, entity);
    return entity;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  count(): number {
    return this.items.size;
  }

  exists(id: string): boolean {
    return this.items.has(id);
  }
}
