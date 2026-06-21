/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserController } from '../../../controllers/UserController';
import { UserService } from '../../../services/UserService';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@inventory/shared-types';

const mockList = jest.fn();

const createMockService = (): UserService =>
  ({ list: mockList } as unknown as UserService);

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

describe('UserController', () => {
  let controller: UserController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserController(createMockService());
  });

  describe('list', () => {
    it('returns 200 with paginated data', async () => {
      const users = [{ id: 'u1', email: 'a@example.com', username: 'alice', role: Role.USER }];
      mockList.mockResolvedValueOnce({
        data: users,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const req = { query: {} } as Request;
      const res = mockRes();

      await controller.list(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: users,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    });

    it('parses page and limit from query params', async () => {
      mockList.mockResolvedValueOnce({ data: [], pagination: { page: 2, limit: 5, total: 0, totalPages: 0 } });

      const req = { query: { page: '2', limit: '5' } } as unknown as Request;
      const res = mockRes();

      await controller.list(req, res, mockNext);

      expect(mockList).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });

    it('calls next with error on service failure', async () => {
      const err = new Error('DB error');
      mockList.mockRejectedValueOnce(err);

      const req = { query: {} } as Request;
      const res = mockRes();

      await controller.list(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('handles missing page/limit query params gracefully', async () => {
      mockList.mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });

      const req = { query: {} } as Request;
      const res = mockRes();

      await controller.list(req, res, mockNext);

      expect(mockList).toHaveBeenCalledWith({ page: undefined, limit: undefined });
    });
  });
});
