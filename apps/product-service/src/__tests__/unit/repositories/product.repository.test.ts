import { ProductRepository } from '../../../repositories/ProductRepository';

// Mock the product model module
jest.mock('../../../models/product.model', () => {
  const createMock = jest.fn();
  const findByIdMock = jest.fn();
  const findOneMock = jest.fn();
  const findMock = jest.fn();
  const findByIdAndUpdateMock = jest.fn();
  const findByIdAndDeleteMock = jest.fn();

  const MockProductModel = jest.fn() as any;

  MockProductModel.create = createMock;
  MockProductModel.findById = findByIdMock;
  MockProductModel.findOne = findOneMock;
  MockProductModel.find = findMock;
  MockProductModel.findByIdAndUpdate = findByIdAndUpdateMock;
  MockProductModel.findByIdAndDelete = findByIdAndDeleteMock;

  return {
    __esModule: true,
    default: MockProductModel,
  };
});

import ProductModel from '../../../models/product.model';

describe('ProductRepository', () => {
  let repository: ProductRepository;

  beforeEach(() => {
    // Reset all static method mocks
    (ProductModel as any).create = jest.fn();
    (ProductModel as any).findById = jest.fn();
    (ProductModel as any).findOne = jest.fn();
    (ProductModel as any).find = jest.fn();
    (ProductModel as any).findByIdAndUpdate = jest.fn();
    (ProductModel as any).findByIdAndDelete = jest.fn();

    repository = new ProductRepository();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const productData = {
        name: 'Test Product',
        price: 100,
        sku: 'TEST001',
        category: 'Test',
        stockQuantity: 5,
      };

      const mockProductDoc = {
        _id: '123',
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (ProductModel.create as jest.Mock).mockResolvedValue(mockProductDoc);

      const result = await repository.create(productData);

      expect(ProductModel.create).toHaveBeenCalledWith(productData);
      expect(result).toEqual(mockProductDoc);
    });

    it('should propagate database errors', async () => {
      const productData = {
        name: 'Test',
        price: 100,
        sku: 'ERR001',
        category: 'Test',
        stockQuantity: 0,
      };

      (ProductModel.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.create(productData)).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should find product by id', async () => {
      const mockProductDoc = {
        _id: '123',
        name: 'Test',
        price: 100,
        sku: 'SKU',
        category: 'Cat',
        stockQuantity: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (ProductModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProductDoc),
      });

      const result = await repository.findById('123');

      expect(ProductModel.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockProductDoc);
    });

    it('should return null when product not found', async () => {
      (ProductModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findBySku', () => {
    it('should find product by sku', async () => {
      const mockProductDoc = {
        _id: '123',
        sku: 'ABC123',
        name: 'Test',
        price: 100,
        category: 'Cat',
        stockQuantity: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (ProductModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProductDoc),
      });

      const result = await repository.findBySku('ABC123');

      expect(ProductModel.findOne).toHaveBeenCalledWith({ sku: 'ABC123' });
      expect(result).toEqual(mockProductDoc);
    });

    it('should return null when sku not found', async () => {
      (ProductModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findBySku('NOTFOUND');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should fetch products with limit and offset', async () => {
      const mockProducts = [{ _id: '1' }, { _id: '2' }] as any[];

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProducts),
      };
      (ProductModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await repository.findAll(10, 5);

      expect(ProductModel.find).toHaveBeenCalled();
      expect(mockQuery.skip).toHaveBeenCalledWith(5);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockProducts);
    });

    it('should fetch all products when no limit', async () => {
      const mockProducts = [{ _id: '1' }] as any[];

      (ProductModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProducts),
      });

      const result = await repository.findAll();

      expect(ProductModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });
  });

  describe('update', () => {
    it('should update product by id', async () => {
      const updateData = { name: 'Updated' };
      const updatedDoc = {
        _id: '123',
        name: 'Updated',
        price: 100,
        sku: 'SKU',
        category: 'Cat',
        stockQuantity: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (ProductModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await repository.update('123', updateData);

      expect(ProductModel.findByIdAndUpdate).toHaveBeenCalledWith('123', updateData, { new: true });
      expect(result).toEqual(updatedDoc);
    });

    it('should return null when product not found on update', async () => {
      (ProductModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update('nonexistent', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when product deleted', async () => {
      (ProductModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '123' }),
      });

      const result = await repository.delete('123');
      expect(ProductModel.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(result).toBe(true);
    });

    it('should return false when product not found on delete', async () => {
      (ProductModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.delete('nonexistent');
      expect(result).toBe(false);
    });
  });
});
