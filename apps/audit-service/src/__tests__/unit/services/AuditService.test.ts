/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { AuditService } from '../../../services/AuditService';
import { IAuditRepository } from '../../../repositories/interfaces/IAuditRepository';
import { Role, AuditAction } from '@inventory/shared-types';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

const mockCreate = jest.fn();
const mockFindAll = jest.fn();

const createMockRepository = () => ({
  create: mockCreate,
  findAll: mockFindAll,
} as unknown as IAuditRepository);

describe('AuditService', () => {
  let service: AuditService;
  let repository: IAuditRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    service = new AuditService(repository, mockLogger);
  });

  describe('createAuditLog', () => {
    it('should create audit log successfully', async () => {
      const data = {
        correlationId: 'test-cid',
        userId: 'user-1',
        username: 'testuser',
        role: Role.ADMIN,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        resourceId: 'prod-1',
      };

      mockCreate.mockResolvedValue({ id: 'audit-1', ...data });

      const result = await service.createAuditLog(data as any);
      expect(result.id).toBe('audit-1');
      expect(mockCreate).toHaveBeenCalledWith(data);
    });
  });

  describe('listAuditLogs', () => {
    it('should list audit logs successfully', async () => {
      const options = { page: 1, limit: 10 };
      const expectedResult = { data: [], total: 0 };
      mockFindAll.mockResolvedValue(expectedResult);

      const result = await service.listAuditLogs(options);
      expect(result).toBe(expectedResult);
      expect(mockFindAll).toHaveBeenCalledWith(options);
    });
  });

  describe('handleAuditEvent', () => {
    it('should successfully parse and save incoming audit event', async () => {
      const payload = {
        userId: 'user-1',
        username: 'testuser',
        role: Role.ADMIN,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        resourceId: 'prod-1',
        before: null,
        after: { name: 'New Product' },
        metadata: { ip: '127.0.0.1' },
      };

      mockCreate.mockResolvedValue({ id: 'audit-1', ...payload, correlationId: 'cid-123' });

      await service.handleAuditEvent(payload, {}, 'cid-123');

      expect(mockCreate).toHaveBeenCalledWith({
        correlationId: 'cid-123',
        userId: 'user-1',
        username: 'testuser',
        role: Role.ADMIN,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        resourceId: 'prod-1',
        before: null,
        after: { name: 'New Product' },
        metadata: { ip: '127.0.0.1' },
      });
    });

    it('should throw error if required field is missing', async () => {
      const payload = {
        userId: 'user-1',
        username: 'testuser',
        role: Role.ADMIN,
        action: AuditAction.CREATE,
        resourceType: 'Product',
        // resourceId is missing
      };

      await expect(service.handleAuditEvent(payload, {}, 'cid-123')).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
