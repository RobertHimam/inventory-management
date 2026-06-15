import { ProductService } from '../../../services/ProductService';
import { IProductRepository } from '../../../repositories/interfaces/IProductRepository';
import { CreateProductDto, UpdateProductDto } from '../../../validation/product.validation';
import { ConflictError, DatabaseError, ValidationError, NotFoundError } from '../../../errors';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger } from '@inventory/shared-logger';

// Mock EventBus
jest.mock('@inventory/shared-rabbitmq');

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setCorrelationId: jest.fn(),
} as unknown as jest.Mocked<Logger>;

// Mock repository
const mockCreate = jest.fn();
const mockFindBySku = jest.fn();
const mockFindById = jest.fn();
const mockFindAll = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const createMockRepository = () => ({
  create: mockCreate,
  findBySku: mockFindBySku,
  findById: mockFindById,
  findAll: mockFindAll,
  update: mockUpdate,
  delete: mockDelete,
} as unknown as IProductRepository);

describe('ProductService', () => {
  let service: ProductService;
  let repository: IProductRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    eventBus = new EventBus({} as any, 'exchange');
    (eventBus.publish as jest.Mock).mockResolvedValue(undefined);
    service = new ProductService(repository, eventBus, mockLogger);
  });

  describe('createProduct', () => {
    it('should create product successfully with valid data', async () => {
      const validDto: CreateProductDto = {
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        sku: 'TEST123',
        category: 'Electronics',
        stockQuantity: 10,
        isActive: true,
      };

      const existingProduct = null;
      mockFindBySku.mockResolvedValueOnce(existingProduct);

      const createdProduct = {
        _id: 'generated-id',
        ...validDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValueOnce(createdProduct);

      const result = await service.createProduct(validDto);

      expect(mockFindBySku).toHaveBeenCalledWith(validDto.sku);
      expect(mockCreate).toHaveBeenCalledWith(validDto);
      expect(result).toEqual(createdProduct);
    });

    it('should throw ConflictError when SKU already exists', async () => {
      const duplicateDto: CreateProductDto = {
        name: 'Another Product',
        price: 50.0,
        sku: 'EXISTING123',
        category: 'Clothing',
        stockQuantity: 5,
        isActive: true,
      };

      const existingProduct = { _id: 'existing-id', sku: duplicateDto.sku };
      mockFindBySku.mockResolvedValueOnce(existingProduct);

      await expect(service.createProduct(duplicateDto)).rejects.toThrow(ConflictError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid DTO', async () => {
      const invalidDto = {
        name: '',
        price: -10,
        sku: '',
        category: '',
        stockQuantity: -5,
      } as unknown as CreateProductDto;

      await expect(service.createProduct(invalidDto)).rejects.toThrow(ValidationError);
      expect(mockFindBySku).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError when repository throws', async () => {
      const validDto: CreateProductDto = {
        name: 'Test Product',
        price: 100,
        sku: 'ERROR123',
        category: 'Test',
        stockQuantity: 10,
        isActive: true,
      };

      mockFindBySku.mockResolvedValueOnce(null);
      mockCreate.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.createProduct(validDto)).rejects.toThrow(DatabaseError);
    });

    it('should publish product.created event when product is successfully created', async () => {
      const validDto: CreateProductDto = {
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        sku: 'TEST123',
        category: 'Electronics',
        stockQuantity: 10,
        isActive: true,
      };

      mockFindBySku.mockResolvedValueOnce(null);

      const createdProduct = {
        _id: 'generated-id',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        sku: 'TEST123',
        category: 'Electronics',
        stockQuantity: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValueOnce(createdProduct);

      const result = await service.createProduct(validDto, 'test-correlation-id');

      expect(result).toEqual(createdProduct);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith('product.created', {
        productId: 'generated-id',
        name: 'Test Product',
        sku: 'TEST123',
        categoryId: 'Electronics',
        price: 99.99,
      }, 'test-correlation-id');
    });

    it('should log error but still return product if event publishing fails', async () => {
      const validDto: CreateProductDto = {
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        sku: 'TEST123',
        category: 'Electronics',
        stockQuantity: 10,
        isActive: true,
      };

      mockFindBySku.mockResolvedValueOnce(null);

      const createdProduct = {
        _id: 'generated-id',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        sku: 'TEST123',
        category: 'Electronics',
        stockQuantity: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValueOnce(createdProduct);
      (eventBus.publish as jest.Mock).mockRejectedValueOnce(new Error('Publish failed'));

      const result = await service.createProduct(validDto);

      expect(result).toEqual(createdProduct);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProduct', () => {
    const productId = 'existing-product-id';
    const existingProduct = {
      _id: productId,
      name: 'Old Name',
      price: 50,
      sku: 'OLDSKU',
      category: 'Old Category',
      stockQuantity: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update product successfully with valid data', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
        price: 75.99,
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockFindBySku.mockResolvedValueOnce(null);

      const updatedProduct = {
        ...existingProduct,
        ...updateDto,
        updatedAt: new Date(),
      };
      mockUpdate.mockResolvedValueOnce(updatedProduct);

      const result = await service.updateProduct(productId, updateDto);

      expect(mockFindById).toHaveBeenCalledWith(productId);
      expect(mockUpdate).toHaveBeenCalledWith(productId, updateDto);
      expect(result).toEqual(updatedProduct);
    });

    it('should allow SKU update without conflict when SKU does not exist', async () => {
      const updateDto: UpdateProductDto = {
        sku: 'NEWSKU123',
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockFindBySku.mockResolvedValueOnce(null); // No existing product with new SKU

      const updatedProduct = { ...existingProduct, sku: 'NEWSKU123', updatedAt: new Date() };
      mockUpdate.mockResolvedValueOnce(updatedProduct);

      const result = await service.updateProduct(productId, updateDto);

      expect(mockFindBySku).toHaveBeenCalledWith('NEWSKU123');
      expect(result).toEqual(updatedProduct);
    });

    it('should throw ConflictError when updating to an existing SKU', async () => {
      const updateDto: UpdateProductDto = {
        sku: 'EXISTINGSKU',
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockFindBySku.mockResolvedValueOnce({ _id: 'other-product-id', sku: 'EXISTINGSKU' }); // Different product exists

      await expect(service.updateProduct(productId, updateDto)).rejects.toThrow(ConflictError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should allow SKU update without conflict when keeping the same SKU', async () => {
      const updateDto: UpdateProductDto = {
        sku: 'OLDSKU', // Same SKU
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockFindBySku.mockResolvedValueOnce(existingProduct); // Same product found

      const updatedProduct = { ...existingProduct, sku: 'OLDSKU', updatedAt: new Date() };
      mockUpdate.mockResolvedValueOnce(updatedProduct);

      const result = await service.updateProduct(productId, updateDto);

      expect(mockFindBySku).not.toHaveBeenCalled();
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
      };

      mockFindById.mockResolvedValueOnce(null);

      await expect(service.updateProduct(productId, updateDto)).rejects.toThrow(NotFoundError);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockFindBySku).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid DTO', async () => {
      const invalidDto = {
        price: -10,
      } as unknown as UpdateProductDto;

      await expect(service.updateProduct(productId, invalidDto)).rejects.toThrow(ValidationError);
      expect(mockFindById).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError when repository throws', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockUpdate.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.updateProduct(productId, updateDto)).rejects.toThrow(DatabaseError);
    });

    it('should handle empty update (no changes)', async () => {
      const updateDto: UpdateProductDto = {};

      mockFindById.mockResolvedValueOnce(existingProduct);
      const updatedProduct = { ...existingProduct, updatedAt: new Date() };
      mockUpdate.mockResolvedValueOnce(updatedProduct);

      const result = await service.updateProduct(productId, updateDto);

      expect(mockUpdate).toHaveBeenCalledWith(productId, {});
      expect(result).toEqual(updatedProduct);
    });

    it('should publish product.updated event when product is successfully updated', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
        price: 75.99,
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockUpdate.mockResolvedValueOnce({
        ...existingProduct,
        ...updateDto,
      });

      const result = await service.updateProduct(productId, updateDto, 'test-correlation-id');

      expect(result.name).toBe(updateDto.name);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith('product.updated', {
        productId,
        name: 'Updated Name',
        price: 75.99,
        sku: 'OLDSKU',
        categoryId: 'Old Category',
        isActive: true,
      }, 'test-correlation-id');
    });

    it('should log error but still return product if event publishing fails for update', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockUpdate.mockResolvedValueOnce({
        ...existingProduct,
        ...updateDto,
      });
      (eventBus.publish as jest.Mock).mockRejectedValueOnce(new Error('Publish failed'));

      const result = await service.updateProduct(productId, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteProduct', () => {
    const productId = 'existing-product-id';
    const deletedBy = 'user-123';
    const existingProduct = {
      _id: productId,
      name: 'Test Product',
      price: 50,
      sku: 'TEST123',
      category: 'Test',
      stockQuantity: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const deletedProduct = {
      ...existingProduct,
      deletedAt: new Date(),
      deletedBy,
    };

    it('should soft delete product successfully', async () => {
      mockFindById.mockResolvedValueOnce(existingProduct);
      mockDelete.mockResolvedValueOnce(deletedProduct);

      const result = await service.deleteProduct(productId, deletedBy);

      expect(mockFindById).toHaveBeenCalledWith(productId);
      expect(mockDelete).toHaveBeenCalledWith(productId, deletedBy);
      expect(result).toEqual(deletedProduct);
      expect(result).toHaveProperty('deletedAt');
      expect(result).toHaveProperty('deletedBy', deletedBy);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.deleteProduct(productId, deletedBy)).rejects.toThrow(NotFoundError);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError when repository throws', async () => {
      mockFindById.mockResolvedValueOnce(existingProduct);
      mockDelete.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.deleteProduct(productId, deletedBy)).rejects.toThrow(DatabaseError);
      expect(mockDelete).toHaveBeenCalledWith(productId, deletedBy);
    });

    it('should throw NotFoundError when repository returns null after delete', async () => {
      mockFindById.mockResolvedValueOnce(existingProduct);
      mockDelete.mockResolvedValueOnce(null);

      await expect(service.deleteProduct(productId, deletedBy)).rejects.toThrow(NotFoundError);
      expect(mockDelete).toHaveBeenCalledWith(productId, deletedBy);
    });

    it('should verify deletedAt and deletedBy fields are set on returned product', async () => {
      const deletedAt = new Date('2024-01-15T10:30:00Z');
      const productWithDeletedAt = {
        ...existingProduct,
        deletedAt,
        deletedBy,
      };

      mockFindById.mockResolvedValueOnce(existingProduct);
      mockDelete.mockResolvedValueOnce(productWithDeletedAt);

      const result = await service.deleteProduct(productId, deletedBy);

      expect(mockFindById).toHaveBeenCalledWith(productId);
      expect(mockDelete).toHaveBeenCalledWith(productId, deletedBy);
      expect(result).toHaveProperty('deletedAt');
      expect(result.deletedAt).toBe(deletedAt);
      expect(result.deletedBy).toBe(deletedBy);
    });

    it('should publish product.deleted event when product is successfully deleted', async () => {
      mockFindById.mockResolvedValueOnce(existingProduct);
      mockDelete.mockResolvedValueOnce(deletedProduct);

      const result = await service.deleteProduct(productId, deletedBy, 'test-correlation-id');

      expect(result).toEqual(deletedProduct);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith('product.deleted', {
        productId,
        deletedBy,
      }, 'test-correlation-id');
    });

    it('should log error but still return deleted product if event publishing fails for delete', async () => {
      mockFindById.mockResolvedValueOnce(existingProduct);
      mockDelete.mockResolvedValueOnce(deletedProduct);
      (eventBus.publish as jest.Mock).mockRejectedValueOnce(new Error('Publish failed'));

      const result = await service.deleteProduct(productId, deletedBy);

      expect(result).toEqual(deletedProduct);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('listProducts', () => {
    it('should list products successfully and calculate correct pagination metadata', async () => {
      const mockProducts = [{ _id: 'prod1', name: 'Product 1' }];
      mockFindAll.mockResolvedValueOnce({
        data: mockProducts,
        total: 25,
      });

      const queryDto = {
        page: 2,
        limit: 10,
        search: 'phone',
        sort: 'price',
        order: 'asc' as const,
      };

      const result = await service.listProducts(queryDto);

      expect(mockFindAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual({
        data: mockProducts,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      });
    });

    it('should use default values if parameters are missing or undefined', async () => {
      const mockProducts = [{ _id: 'prod1', name: 'Product 1' }];
      mockFindAll.mockResolvedValueOnce({
        data: mockProducts,
        total: 5,
      });

      const result = await service.listProducts({});

      expect(mockFindAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sort: 'createdAt',
        order: 'desc',
      });
      expect(result).toEqual({
        data: mockProducts,
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      });
    });

    it('should return 0 totalPages if total is 0', async () => {
      mockFindAll.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      const result = await service.listProducts({ limit: 5 });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
      });
    });

    it('should throw DatabaseError if repository.findAll rejects', async () => {
      mockFindAll.mockRejectedValueOnce(new Error('DB failure'));

      await expect(service.listProducts({})).rejects.toThrow(DatabaseError);
    });
  });

  describe('getProductDetail', () => {
    const productId = 'existing-product-id';
    const mockProduct = {
      _id: productId,
      name: 'Test Product',
      price: 50,
      sku: 'TEST123',
      category: 'Test',
      stockQuantity: 10,
      isActive: true,
      deletedAt: null,
    };

    it('should return product details successfully', async () => {
      mockFindById.mockResolvedValueOnce(mockProduct);

      const result = await service.getProductDetail(productId);

      expect(mockFindById).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.getProductDetail(productId)).rejects.toThrow(NotFoundError);
      expect(mockFindById).toHaveBeenCalledWith(productId);
    });

    it('should throw DatabaseError when repository throws', async () => {
      mockFindById.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getProductDetail(productId)).rejects.toThrow(DatabaseError);
    });
  });
});
