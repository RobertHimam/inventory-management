/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserService } from '../../../services/UserService';
import { IUserRepository } from '../../../repositories/interfaces/IUserRepository';
import { User, Role } from '@inventory/shared-types';

const mockFindAll = jest.fn();
const mockFindByEmail = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockSoftDelete = jest.fn();

const createMockRepo = (): IUserRepository =>
  ({
    findAll: mockFindAll,
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    create: mockCreate,
    softDelete: mockSoftDelete,
  } as unknown as IUserRepository);

const baseUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'a@example.com',
  username: 'alice',
  role: Role.USER,
  passwordHash: 'hashed-secret',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(createMockRepo());
  });

  describe('list', () => {
    it('returns paginated results with correct metadata', async () => {
      const users = [baseUser({ id: 'u1' }), baseUser({ id: 'u2' })];
      mockFindAll.mockResolvedValueOnce({ data: users, total: 25 });

      const result = await service.list({ page: 3, limit: 2 });

      expect(mockFindAll).toHaveBeenCalledWith({ page: 3, limit: 2 });
      expect(result.data.length).toBe(2);
      expect(result.pagination).toEqual({ page: 3, limit: 2, total: 25, totalPages: 13 });
    });

    it('uses default page=1 and limit=10 when not provided', async () => {
      mockFindAll.mockResolvedValueOnce({ data: [], total: 0 });

      const result = await service.list({});

      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    });

    it('returns totalPages=0 when limit is 0', async () => {
      mockFindAll.mockResolvedValueOnce({ data: [], total: 5 });

      const result = await service.list({ page: 1, limit: 0 });

      expect(result.pagination.totalPages).toBe(0);
    });

    it('strips passwordHash from returned users', async () => {
      const userWithHash = baseUser({ passwordHash: 'super-secret' });
      mockFindAll.mockResolvedValueOnce({ data: [userWithHash], total: 1 });

      const result = await service.list({});

      expect((result.data[0] as any).passwordHash).toBeUndefined();
    });

    it('does not mutate original user objects', async () => {
      const original = baseUser({ passwordHash: 'secret' });
      mockFindAll.mockResolvedValueOnce({ data: [original], total: 1 });

      await service.list({});

      expect(original.passwordHash).toBe('secret');
    });
  });
});
