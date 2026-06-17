import {
  User,
  Role,
  CreateUserDto,
  Product,
  Category,
  Supplier,
  CreateProductDto,
  InventoryItem,
  StockIn,
  StockOut,
  StockAdjustment,
  AuditLog,
  AuditAction,
  Pagination,
  ApiResponse,
  BaseEvent,
} from '../src';

describe('shared-types', () => {
  describe('Role enum', () => {
    it('should have ADMIN and USER', () => {
      expect(Role.ADMIN).toBe('ADMIN');
      expect(Role.USER).toBe('USER');
    });
  });

  describe('User type', () => {
    it('should accept valid user object', () => {
      const user: User = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      expect(user.id).toBe('123');
    });
  });

  describe('CreateUserDto', () => {
    it('should accept valid create dto', () => {
      const dto: CreateUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
        role: Role.USER,
      };
      expect(dto.email).toBe('new@example.com');
    });
  });

  describe('CreateProductDto', () => {
    it('should accept valid create product dto', () => {
      const dto: CreateProductDto = {
        name: 'New Widget',
        sku: 'NW-001',
        category: 'Electronics',
        price: 29.99,
        stockQuantity: 50,
      };
      expect(dto.sku).toBe('NW-001');
    });
  });

  describe('Product type', () => {
    it('should accept valid product object', () => {
      const product: Product = {
        _id: 'p1',
        name: 'Widget',
        sku: 'W-001',
        category: 'Electronics',
        price: 19.99,
        stockQuantity: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      expect(product.name).toBe('Widget');
    });
  });

  describe('Category and Supplier', () => {
    it('should accept valid category', () => {
      const cat: Category = {
        id: 'c1',
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      expect(cat.name).toBe('Electronics');
    });

    it('should accept valid supplier', () => {
      const sup: Supplier = {
        id: 's1',
        name: 'Acme Corp',
        contactEmail: 'acme@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      expect(sup.name).toBe('Acme Corp');
    });
  });

  describe('Inventory types', () => {
    it('should accept inventory item', () => {
      const item: InventoryItem = {
        productId: 'p1',
        quantity: 50,
        updatedAt: new Date(),
      };
      expect(item.quantity).toBe(50);
    });

    it('should accept stock in', () => {
      const stockIn: StockIn = {
        id: 'si1',
        productId: 'p1',
        quantity: 20,
        createdAt: new Date(),
        createdBy: 'user1',
      };
      expect(stockIn.quantity).toBe(20);
    });

    it('should accept stock out', () => {
      const stockOut: StockOut = {
        id: 'so1',
        productId: 'p1',
        quantity: 5,
        createdAt: new Date(),
        createdBy: 'user1',
      };
      expect(stockOut.quantity).toBe(5);
    });

    it('should accept stock adjustment', () => {
      const adj: StockAdjustment = {
        id: 'adj1',
        productId: 'p1',
        quantity: -2,
        previousQuantity: 10,
        newQuantity: 8,
        reason: 'damaged',
        adjustedBy: 'user1',
        createdAt: new Date(),
      };
      expect(adj.quantity).toBe(-2);
    });
  });

  describe('AuditLog', () => {
    it('should accept valid audit log', () => {
      const audit: AuditLog = {
        id: 'a1',
        correlationId: 'corr-123',
        userId: 'u1',
        username: 'admin',
        role: Role.ADMIN,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        resourceId: 'p1',
        createdAt: new Date(),
      };
      expect(audit.action).toBe(AuditAction.CREATE);
    });
  });

  describe('Pagination and ApiResponse', () => {
    it('should accept pagination', () => {
      const pagination: Pagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
      };
      expect(pagination.totalPages).toBe(10);
    });

    it('should accept api response with data', () => {
      const resp: ApiResponse<{ items: string[] }> = {
        success: true,
        data: { items: ['a', 'b'] },
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };
      expect(resp.success).toBe(true);
    });

    it('should accept api response with error', () => {
      const resp: ApiResponse = {
        success: false,
        error: 'Not found',
      };
      expect(resp.success).toBe(false);
    });
  });

  describe('BaseEvent', () => {
    it('should accept valid base event', () => {
      const event: BaseEvent = {
        correlationId: 'corr-123',
        timestamp: new Date(),
        type: 'product.created',
        version: 'v1',
        payload: { productId: 'p1' },
      };
      expect(event.type).toBe('product.created');
    });
  });
});
