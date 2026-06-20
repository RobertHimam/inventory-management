/* eslint-disable @typescript-eslint/no-explicit-any */
import { CategoryController } from '../../../controllers/CategoryController';
import { CategoryService } from '../../../services/CategoryService';
import { Request, Response } from 'express';
import { ValidationError, NotFoundError, ConflictError } from '../../../errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn(),
    json: jest.fn(),
  };
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<Request> = {}): Request =>
  ({
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request);

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockService: jest.Mocked<CategoryService>;

  beforeEach(() => {
    mockService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
    controller = new CategoryController(mockService);
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('responds 200 with paginated categories on success', async () => {
      // Arrange
      const paginatedResult = {
        data: [{ _id: 'cat1', name: 'Electronics' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockService.list.mockResolvedValueOnce(paginatedResult);
      const req = mockReq({ query: { page: '1', limit: '10' } as any });
      const res = mockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, ...paginatedResult });
    });

    it('responds 200 with default query params when none provided', async () => {
      // Arrange
      const paginatedResult = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockService.list.mockResolvedValueOnce(paginatedResult);
      const req = mockReq({ query: {} as any });
      const res = mockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, ...paginatedResult });
    });

    it('responds 500 when service throws an unexpected error', async () => {
      // Arrange
      mockService.list.mockRejectedValueOnce(new Error('DB failure'));
      const req = mockReq({ query: {} as any });
      const res = mockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('responds 200 with category on success', async () => {
      // Arrange
      const category = { _id: 'cat1', name: 'Electronics' };
      mockService.getById.mockResolvedValueOnce(category as any);
      const req = mockReq({ params: { id: 'cat1' } });
      const res = mockResponse();

      // Act
      await controller.getById(req, res);

      // Assert
      expect(mockService.getById).toHaveBeenCalledWith('cat1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: category });
    });

    it('responds 404 when category is not found', async () => {
      // Arrange
      mockService.getById.mockRejectedValueOnce(new NotFoundError("Category 'cat1' not found"));
      const req = mockReq({ params: { id: 'cat1' } });
      const res = mockResponse();

      // Act
      await controller.getById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Category 'cat1' not found" });
    });

    it('responds 500 for unexpected errors', async () => {
      // Arrange
      mockService.getById.mockRejectedValueOnce(new Error('Unexpected'));
      const req = mockReq({ params: { id: 'cat1' } });
      const res = mockResponse();

      // Act
      await controller.getById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('responds 201 with created category on success', async () => {
      // Arrange
      const dto = { name: 'Electronics', description: 'Consumer electronics' };
      const createdCategory = { _id: 'cat1', ...dto };
      mockService.create.mockResolvedValueOnce(createdCategory as any);
      const req = mockReq({ body: dto });
      const res = mockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: createdCategory });
    });

    it('responds 400 for ValidationError', async () => {
      // Arrange
      mockService.create.mockRejectedValueOnce(new ValidationError('Invalid category data'));
      const req = mockReq({ body: { name: '' } });
      const res = mockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid category data' });
    });

    it('responds 409 for ConflictError', async () => {
      // Arrange
      mockService.create.mockRejectedValueOnce(new ConflictError("Category 'Electronics' already exists"));
      const req = mockReq({ body: { name: 'Electronics' } });
      const res = mockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Category 'Electronics' already exists" });
    });

    it('responds 500 for unexpected errors', async () => {
      // Arrange
      mockService.create.mockRejectedValueOnce(new Error('Server crash'));
      const req = mockReq({ body: { name: 'Electronics' } });
      const res = mockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('responds 200 with updated category on success', async () => {
      // Arrange
      const dto = { name: 'Updated Electronics' };
      const updatedCategory = { _id: 'cat1', name: 'Updated Electronics' };
      mockService.update.mockResolvedValueOnce(updatedCategory as any);
      const req = mockReq({ params: { id: 'cat1' }, body: dto });
      const res = mockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(mockService.update).toHaveBeenCalledWith('cat1', dto);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedCategory });
    });

    it('responds 404 when category not found', async () => {
      // Arrange
      mockService.update.mockRejectedValueOnce(new NotFoundError("Category 'cat1' not found"));
      const req = mockReq({ params: { id: 'cat1' }, body: { name: 'X' } });
      const res = mockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Category 'cat1' not found" });
    });

    it('responds 400 for ValidationError', async () => {
      // Arrange
      mockService.update.mockRejectedValueOnce(new ValidationError('Name too long'));
      const req = mockReq({ params: { id: 'cat1' }, body: { name: 'A'.repeat(101) } });
      const res = mockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Name too long' });
    });

    it('responds 409 for ConflictError', async () => {
      // Arrange
      mockService.update.mockRejectedValueOnce(new ConflictError("Category 'Clothing' already exists"));
      const req = mockReq({ params: { id: 'cat1' }, body: { name: 'Clothing' } });
      const res = mockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Category 'Clothing' already exists" });
    });

    it('responds 500 for unexpected errors', async () => {
      // Arrange
      mockService.update.mockRejectedValueOnce(new Error('Unexpected'));
      const req = mockReq({ params: { id: 'cat1' }, body: { name: 'X' } });
      const res = mockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('responds 200 with null data on successful soft-delete', async () => {
      // Arrange
      const deletedCategory = { _id: 'cat1', name: 'Electronics', deletedAt: new Date(), deletedBy: 'user-123' };
      mockService.delete.mockResolvedValueOnce(deletedCategory as any);
      const req = mockReq({ params: { id: 'cat1' }, user: { userId: 'user-123' } } as any);
      const res = mockResponse();

      // Act
      await controller.delete(req, res);

      // Assert
      expect(mockService.delete).toHaveBeenCalledWith('cat1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    });

    it('uses "unknown" as deletedBy when req.user is absent', async () => {
      // Arrange
      mockService.delete.mockResolvedValueOnce({} as any);
      const req = mockReq({ params: { id: 'cat1' } });
      const res = mockResponse();

      // Act
      await controller.delete(req, res);

      // Assert
      expect(mockService.delete).toHaveBeenCalledWith('cat1', 'unknown');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responds 404 when category not found', async () => {
      // Arrange
      mockService.delete.mockRejectedValueOnce(new NotFoundError("Category 'cat1' not found"));
      const req = mockReq({ params: { id: 'cat1' }, user: { userId: 'user-123' } } as any);
      const res = mockResponse();

      // Act
      await controller.delete(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Category 'cat1' not found" });
    });

    it('responds 500 for unexpected errors', async () => {
      // Arrange
      mockService.delete.mockRejectedValueOnce(new Error('DB crash'));
      const req = mockReq({ params: { id: 'cat1' }, user: { userId: 'user-123' } } as any);
      const res = mockResponse();

      // Act
      await controller.delete(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    });
  });
});
