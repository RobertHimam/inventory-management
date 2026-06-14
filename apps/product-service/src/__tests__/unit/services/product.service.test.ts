import { ProductService } from '../../../services/ProductService';
import { IProductRepository } from '../../../repositories/interfaces/IProductRepository';
import { CreateProductDto, UpdateProductDto } from '../../../validation/product.validation';
import { ConflictError, DatabaseError, ValidationError, NotFoundError } from '../../../errors';

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

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    service = new ProductService(repository);
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

      expect(mockFindBySku).toHaveBeenCalledWith('OLDSKU');
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
  });
});
