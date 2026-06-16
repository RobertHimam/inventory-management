import { ProductController } from '../../../controllers/ProductController';
import { ProductService } from '../../../services/ProductService';
import { Request, Response } from 'express';
import { CreateProductDto, UpdateProductDto } from '../../../validation/product.validation';
import { ValidationError, ConflictError, NotFoundError } from '../../../errors';

const mockRequest = (body?: Partial<CreateProductDto>): Request => {
  return {
    body: body || {},
  } as Request<{ id: string }, {}, UpdateProductDto>;
};

const mockResponse = (): Response => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  } as Partial<Response>;

  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);

  return res as Response;
};

describe('ProductController', () => {
  let controller: ProductController;
  let mockService: jest.Mocked<ProductService>;

  beforeEach(() => {
    mockService = {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      listProducts: jest.fn(),
      getProductDetail: jest.fn(),
    } as any;
    controller = new ProductController(mockService);
  });

  describe('createProduct', () => {
    it('should respond with 201 and product on success', async () => {
      const dto: CreateProductDto = {
        name: 'New Product',
        price: 29.99,
        sku: 'NEW001',
        category: 'Books',
        stockQuantity: 100,
        isActive: true,
      };

      const createdProduct = { _id: 'abc123', ...dto };
      mockService.createProduct.mockResolvedValueOnce(createdProduct);

      const req = mockRequest(dto);
      const res = mockResponse();

      await controller.createProduct(req, res);

      expect(mockService.createProduct).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: createdProduct,
      });
    });

    it('should respond with 400 for validation error', async () => {
      const invalidData = {
        name: '',
        price: -10,
        sku: '',
        category: '',
        stockQuantity: -5,
      } as unknown as CreateProductDto;

      mockService.createProduct.mockRejectedValueOnce(
        new ValidationError('Invalid product data')
      );

      const req = mockRequest(invalidData);
      const res = mockResponse();

      await controller.createProduct(req, res);

      expect(mockService.createProduct).toHaveBeenCalledWith(invalidData);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid product data',
      });
    });

    it('should respond with 409 for conflict error', async () => {
      const dto: CreateProductDto = {
        name: 'Duplicate',
        price: 10,
        sku: 'DUP001',
        category: 'Test',
        stockQuantity: 1,
        isActive: true,
      };

      mockService.createProduct.mockRejectedValueOnce(
        new ConflictError("Product with SKU 'DUP001' already exists")
      );

      const req = mockRequest(dto);
      const res = mockResponse();

      await controller.createProduct(req, res);

      expect(mockService.createProduct).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Product with SKU 'DUP001' already exists",
      });
    });

    it('should respond with 500 for unexpected errors', async () => {
      const dto: CreateProductDto = {
        name: 'Test',
        price: 10,
        sku: 'ERR001',
        category: 'Test',
        stockQuantity: 1,
        isActive: true,
      };

      mockService.createProduct.mockRejectedValueOnce(new Error('Server error'));

      const req = mockRequest(dto);
      const res = mockResponse();

      await controller.createProduct(req, res);

      expect(mockService.createProduct).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('updateProduct', () => {
    const productId = 'product-id-123';

    it('should respond with 200 and updated product on success', async () => {
      const updateDto: UpdateProductDto = { name: 'Updated' };
      mockService.updateProduct = jest.fn().mockResolvedValueOnce({ _id: productId, name: 'Updated' });

      const req = { body: updateDto, params: { id: productId } } as Request<{ id: string }, {}, UpdateProductDto>;
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(mockService.updateProduct).toHaveBeenCalledWith(productId, updateDto);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { _id: productId, name: 'Updated' },
      });
    });

    it('should respond with 404 when product not found', async () => {
      const updateDto: UpdateProductDto = { name: 'Updated' };
      mockService.updateProduct.mockRejectedValueOnce(new NotFoundError('Product not found'));

      const req = { body: updateDto, params: { id: productId } } as Request<{ id: string }, {}, UpdateProductDto>;
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });
    });

    it('should respond with 400 for validation error', async () => {
      const invalidDto = { price: -5 } as unknown as UpdateProductDto;
      mockService.updateProduct.mockRejectedValueOnce(new ValidationError('Invalid data'));

      const req = { body: invalidDto, params: { id: productId } } as Request<{ id: string }, {}, UpdateProductDto>;
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid data',
      });
    });

    it('should respond with 409 for conflict error', async () => {
      const updateDto: UpdateProductDto = { sku: 'DUP' };
      mockService.updateProduct.mockRejectedValueOnce(new ConflictError("SKU 'DUP' already exists"));

      const req = { body: updateDto, params: { id: productId } } as Request<{ id: string }, {}, UpdateProductDto>;
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "SKU 'DUP' already exists",
      });
    });

    it('should respond with 500 for unexpected errors', async () => {
      const updateDto: UpdateProductDto = { name: 'Test' };
      mockService.updateProduct.mockRejectedValueOnce(new Error('Unexpected'));

      const req = { body: updateDto, params: { id: productId } } as Request<{ id: string }, {}, UpdateProductDto>;
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('deleteProduct', () => {
    const productId = 'product-id-123';
    const deletedProduct = {
      _id: productId,
      name: 'Deleted Product',
      deletedAt: new Date(),
    };

    it('should respond with 200 and deleted product on success', async () => {
      const deletedProductWithUser = {
        ...deletedProduct,
        deletedBy: 'user-123',
      };
      mockService.deleteProduct.mockResolvedValueOnce(deletedProductWithUser);

      const req = { params: { id: productId }, user: { userId: 'user-123', role: 'ADMIN' } } as any;
      const res = mockResponse();

      await controller.deleteProduct(req, res);

      expect(mockService.deleteProduct).toHaveBeenCalledWith(productId, 'user-123', undefined, { userId: 'user-123', role: 'ADMIN' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: deletedProductWithUser,
      });
    });

    it('should fall back to unknown for deletedBy when req.user is not present', async () => {
      const deletedProductWithSystem = {
        ...deletedProduct,
        deletedBy: 'unknown',
      };
      mockService.deleteProduct.mockResolvedValueOnce(deletedProductWithSystem);

      const req = { params: { id: productId } } as any;
      const res = mockResponse();

      await controller.deleteProduct(req, res);

      expect(mockService.deleteProduct).toHaveBeenCalledWith(productId, 'unknown');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should respond with 404 when product not found', async () => {
      mockService.deleteProduct.mockRejectedValueOnce(new NotFoundError('Product not found'));

      const req = { params: { id: productId }, user: { userId: 'user-123', role: 'ADMIN' } } as any;
      const res = mockResponse();

      await controller.deleteProduct(req, res);

      expect(mockService.deleteProduct).toHaveBeenCalledWith(productId, 'user-123', undefined, { userId: 'user-123', role: 'ADMIN' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });
    });

    it('should respond with 500 for unexpected errors', async () => {
      mockService.deleteProduct.mockRejectedValueOnce(new Error('Database failure'));

      const req = { params: { id: productId }, user: { userId: 'user-123', role: 'ADMIN' } } as any;
      const res = mockResponse();

      await controller.deleteProduct(req, res);

      expect(mockService.deleteProduct).toHaveBeenCalledWith(productId, 'user-123', undefined, { userId: 'user-123', role: 'ADMIN' });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('listProducts', () => {
    it('should respond with 200 and paginated products on success', async () => {
      const paginatedResult = {
        data: [{ _id: 'prod1', name: 'Product 1' }],
        pagination: {
          page: 2,
          limit: 5,
          total: 10,
          totalPages: 2,
        },
      };
      mockService.listProducts.mockResolvedValueOnce(paginatedResult);

      const req = {
        query: {
          page: '2',
          limit: '5',
          search: 'phone',
          sort: 'price',
          order: 'asc',
        },
      } as any;
      const res = mockResponse();

      await controller.listProducts(req, res);

      expect(mockService.listProducts).toHaveBeenCalledWith({
        page: '2',
        limit: '5',
        search: 'phone',
        sort: 'price',
        order: 'asc',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: paginatedResult.data,
        pagination: paginatedResult.pagination,
      });
    });

    it('should fall back to defaults and call service with parsed query parameters', async () => {
      const paginatedResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockService.listProducts.mockResolvedValueOnce(paginatedResult);

      const req = { query: {} } as any;
      const res = mockResponse();

      await controller.listProducts(req, res);

      expect(mockService.listProducts).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should respond with 400 for validation errors on query parameters', async () => {
      mockService.listProducts.mockRejectedValueOnce(new ValidationError('Invalid page number'));

      const req = { query: { page: '-1' } } as any;
      const res = mockResponse();

      await controller.listProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid page number',
      });
    });

    it('should respond with 500 for unexpected errors', async () => {
      mockService.listProducts.mockRejectedValueOnce(new Error('Unexpected error'));

      const req = { query: {} } as any;
      const res = mockResponse();

      await controller.listProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('getProductDetail', () => {
    const productId = 'product-id-123';
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

    it('should respond with 200 and product details on success', async () => {
      mockService.getProductDetail.mockResolvedValueOnce(mockProduct);

      const req = { params: { id: productId } } as any;
      const res = mockResponse();

      await controller.getProductDetail(req, res);

      expect(mockService.getProductDetail).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProduct,
      });
    });

    it('should respond with 404 when product is not found', async () => {
      mockService.getProductDetail.mockRejectedValueOnce(new NotFoundError('Product not found'));

      const req = { params: { id: productId } } as any;
      const res = mockResponse();

      await controller.getProductDetail(req, res);

      expect(mockService.getProductDetail).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });
    });

    it('should respond with 500 for unexpected errors', async () => {
      mockService.getProductDetail.mockRejectedValueOnce(new Error('Unexpected error'));

      const req = { params: { id: productId } } as any;
      const res = mockResponse();

      await controller.getProductDetail(req, res);

      expect(mockService.getProductDetail).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });
});
