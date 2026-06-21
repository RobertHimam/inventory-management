/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupplierController } from '../../../controllers/SupplierController';
import { SupplierService } from '../../../services/SupplierService';
import { Request, Response } from 'express';
import { ValidationError, NotFoundError, ConflictError } from '../../../errors';

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
  ({ body: {}, params: {}, query: {}, ...overrides } as unknown as Request);

describe('SupplierController', () => {
  let controller: SupplierController;
  let mockService: jest.Mocked<SupplierService>;

  beforeEach(() => {
    mockService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
    controller = new SupplierController(mockService);
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('responds 200 with paginated suppliers on success', async () => {
      const paginatedResult = {
        data: [{ _id: 's1', name: 'Acme Corp' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockService.list.mockResolvedValueOnce(paginatedResult);
      const req = mockReq({ query: { page: '1', limit: '10' } as any });
      const res = mockResponse();

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, ...paginatedResult });
    });

    it('responds 200 with defaults when no query params', async () => {
      const paginatedResult = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockService.list.mockResolvedValueOnce(paginatedResult);
      const req = mockReq({ query: {} as any });
      const res = mockResponse();

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responds 500 on unexpected error', async () => {
      mockService.list.mockRejectedValueOnce(new Error('DB failure'));
      const req = mockReq({ query: {} as any });
      const res = mockResponse();

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('responds 200 with supplier on success', async () => {
      const supplier = { _id: 's1', name: 'Acme Corp' };
      mockService.getById.mockResolvedValueOnce(supplier as any);
      const req = mockReq({ params: { id: 's1' } });
      const res = mockResponse();

      await controller.getById(req, res);

      expect(mockService.getById).toHaveBeenCalledWith('s1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: supplier });
    });

    it('responds 404 when not found', async () => {
      mockService.getById.mockRejectedValueOnce(new NotFoundError("Supplier 's1' not found"));
      const req = mockReq({ params: { id: 's1' } });
      const res = mockResponse();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Supplier 's1' not found" });
    });

    it('responds 500 on unexpected error', async () => {
      mockService.getById.mockRejectedValueOnce(new Error('Unexpected'));
      const req = mockReq({ params: { id: 's1' } });
      const res = mockResponse();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('responds 201 with created supplier', async () => {
      const dto = { name: 'Acme Corp', contactEmail: 'contact@acme.com' };
      const created = { _id: 's1', ...dto };
      mockService.create.mockResolvedValueOnce(created as any);
      const req = mockReq({ body: dto });
      const res = mockResponse();

      await controller.create(req, res);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });

    it('responds 400 for ValidationError', async () => {
      mockService.create.mockRejectedValueOnce(new ValidationError('Invalid supplier data'));
      const req = mockReq({ body: { name: '' } });
      const res = mockResponse();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid supplier data' });
    });

    it('responds 409 for ConflictError', async () => {
      mockService.create.mockRejectedValueOnce(new ConflictError("Supplier 'Acme Corp' already exists"));
      const req = mockReq({ body: { name: 'Acme Corp' } });
      const res = mockResponse();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: "Supplier 'Acme Corp' already exists" });
    });

    it('responds 500 on unexpected error', async () => {
      mockService.create.mockRejectedValueOnce(new Error('crash'));
      const req = mockReq({ body: { name: 'Acme' } });
      const res = mockResponse();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('responds 200 with updated supplier', async () => {
      const dto = { name: 'Acme Corp Updated' };
      const updated = { _id: 's1', ...dto };
      mockService.update.mockResolvedValueOnce(updated as any);
      const req = mockReq({ params: { id: 's1' }, body: dto });
      const res = mockResponse();

      await controller.update(req, res);

      expect(mockService.update).toHaveBeenCalledWith('s1', dto);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    it('responds 404 when not found', async () => {
      mockService.update.mockRejectedValueOnce(new NotFoundError("Supplier 's1' not found"));
      const req = mockReq({ params: { id: 's1' }, body: { name: 'X' } });
      const res = mockResponse();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responds 400 for ValidationError', async () => {
      mockService.update.mockRejectedValueOnce(new ValidationError('Invalid email'));
      const req = mockReq({ params: { id: 's1' }, body: { contactEmail: 'bad' } });
      const res = mockResponse();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responds 409 for ConflictError', async () => {
      mockService.update.mockRejectedValueOnce(new ConflictError("Supplier 'Acme' already exists"));
      const req = mockReq({ params: { id: 's1' }, body: { name: 'Acme' } });
      const res = mockResponse();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('responds 500 on unexpected error', async () => {
      mockService.update.mockRejectedValueOnce(new Error('Unexpected'));
      const req = mockReq({ params: { id: 's1' }, body: { name: 'X' } });
      const res = mockResponse();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('responds 200 with null data on soft-delete', async () => {
      const deleted = { _id: 's1', name: 'Acme Corp', deletedAt: new Date(), deletedBy: 'user-123' };
      mockService.delete.mockResolvedValueOnce(deleted as any);
      const req = mockReq({ params: { id: 's1' }, user: { userId: 'user-123' } } as any);
      const res = mockResponse();

      await controller.delete(req, res);

      expect(mockService.delete).toHaveBeenCalledWith('s1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    });

    it('uses "unknown" as deletedBy when req.user absent', async () => {
      mockService.delete.mockResolvedValueOnce({} as any);
      const req = mockReq({ params: { id: 's1' } });
      const res = mockResponse();

      await controller.delete(req, res);

      expect(mockService.delete).toHaveBeenCalledWith('s1', 'unknown');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responds 404 when not found', async () => {
      mockService.delete.mockRejectedValueOnce(new NotFoundError("Supplier 's1' not found"));
      const req = mockReq({ params: { id: 's1' }, user: { userId: 'u1' } } as any);
      const res = mockResponse();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responds 500 on unexpected error', async () => {
      mockService.delete.mockRejectedValueOnce(new Error('DB crash'));
      const req = mockReq({ params: { id: 's1' }, user: { userId: 'u1' } } as any);
      const res = mockResponse();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
