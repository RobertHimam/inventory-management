/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupplierService } from '../../../services/SupplierService';
import { SupplierRepository } from '../../../repositories/SupplierRepository';
import { ValidationError, NotFoundError, ConflictError } from '../../../errors';

const mockCreate = jest.fn();
const mockFindById = jest.fn();
const mockFindByName = jest.fn();
const mockFindAll = jest.fn();
const mockUpdate = jest.fn();
const mockSoftDelete = jest.fn();

const createMockRepository = (): SupplierRepository =>
  ({
    create: mockCreate,
    findById: mockFindById,
    findByName: mockFindByName,
    findAll: mockFindAll,
    update: mockUpdate,
    softDelete: mockSoftDelete,
  } as unknown as SupplierRepository);

describe('SupplierService', () => {
  let service: SupplierService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SupplierService(createMockRepository());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('returns paginated results with correct metadata', async () => {
      const mockSuppliers = [
        { _id: 's1', name: 'Acme Corp' },
        { _id: 's2', name: 'Global Supplies' },
      ];
      mockFindAll.mockResolvedValueOnce({ data: mockSuppliers, total: 25 });

      const result = await service.list({ page: 3, limit: 2 });

      expect(mockFindAll).toHaveBeenCalledWith({ page: 3, limit: 2 });
      expect(result.data).toEqual(mockSuppliers);
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
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('returns the supplier when found', async () => {
      const mockSupplier = { _id: 's1', name: 'Acme Corp', deletedAt: null };
      mockFindById.mockResolvedValueOnce(mockSupplier);

      const result = await service.getById('s1');

      expect(mockFindById).toHaveBeenCalledWith('s1');
      expect(result).toEqual(mockSupplier);
    });

    it('throws NotFoundError when supplier does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      const promise = service.getById('nonexistent-id');

      await expect(promise).rejects.toThrow(NotFoundError);
      await expect(promise).rejects.toThrow("Supplier 'nonexistent-id' not found");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('throws ValidationError for empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ValidationError when name is missing', async () => {
      await expect(service.create({ contactEmail: 'a@b.com' })).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ValidationError when name exceeds 100 characters', async () => {
      await expect(service.create({ name: 'A'.repeat(101) })).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ValidationError when contactEmail is invalid', async () => {
      await expect(service.create({ name: 'Acme', contactEmail: 'not-an-email' })).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ConflictError when supplier name already exists and is active', async () => {
      mockFindByName.mockResolvedValue({ _id: 's1', name: 'Acme Corp', deletedAt: null });

      const promise = service.create({ name: 'Acme Corp' });

      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toThrow("Supplier 'Acme Corp' already exists");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates supplier when name is unique', async () => {
      const dto = { name: 'Acme Corp', contactEmail: 'contact@acme.com', phone: '555-1234', address: '123 Main St' };
      mockFindByName.mockResolvedValueOnce(null);
      const created = { _id: 's1', ...dto, deletedAt: null };
      mockCreate.mockResolvedValueOnce(created);

      const result = await service.create(dto);

      expect(mockFindByName).toHaveBeenCalledWith('Acme Corp');
      expect(mockCreate).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('creates supplier when existing with same name is soft-deleted', async () => {
      mockFindByName.mockResolvedValueOnce({ _id: 's-old', name: 'Acme Corp', deletedAt: new Date() });
      const created = { _id: 's2', name: 'Acme Corp', deletedAt: null };
      mockCreate.mockResolvedValueOnce(created);

      const result = await service.create({ name: 'Acme Corp' });

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('throws ValidationError for null input', async () => {
      await expect(service.create(null)).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    const existing = { _id: 's1', name: 'Acme Corp', deletedAt: null };

    it('throws NotFoundError when supplier not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.update('nonexistent-id', { name: 'New Name' })).rejects.toThrow(NotFoundError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws ConflictError when new name already taken by another active supplier', async () => {
      mockFindById.mockResolvedValue(existing);
      mockFindByName.mockResolvedValue({ _id: 's2', name: 'Global Supplies', deletedAt: null });

      const promise = service.update('s1', { name: 'Global Supplies' });

      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toThrow("Supplier 'Global Supplies' already exists");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('succeeds updating to same name (no conflict check)', async () => {
      mockFindById.mockResolvedValueOnce(existing);
      const updated = { ...existing, address: 'New Address' };
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await service.update('s1', { name: 'Acme Corp', address: 'New Address' });

      expect(mockFindByName).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('succeeds for valid data with new unique name', async () => {
      mockFindById.mockResolvedValueOnce(existing);
      mockFindByName.mockResolvedValueOnce(null);
      const updated = { ...existing, name: 'New Name' };
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await service.update('s1', { name: 'New Name' });

      expect(mockFindByName).toHaveBeenCalledWith('New Name');
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when repo.update returns null', async () => {
      mockFindById.mockResolvedValueOnce(existing);
      mockUpdate.mockResolvedValueOnce(null);

      await expect(service.update('s1', { address: 'somewhere' })).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError for invalid contactEmail on update', async () => {
      mockFindById.mockResolvedValueOnce(existing);

      await expect(service.update('s1', { contactEmail: 'bad-email' })).rejects.toThrow(ValidationError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('throws NotFoundError when supplier does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.delete('nonexistent-id', 'user-abc')).rejects.toThrow(NotFoundError);
      expect(mockSoftDelete).not.toHaveBeenCalled();
    });

    it('calls softDelete with correct id and deletedBy', async () => {
      const existing = { _id: 's1', name: 'Acme Corp', deletedAt: null };
      const deleted = { ...existing, deletedAt: new Date(), deletedBy: 'user-abc' };
      mockFindById.mockResolvedValueOnce(existing);
      mockSoftDelete.mockResolvedValueOnce(deleted);

      const result = await service.delete('s1', 'user-abc');

      expect(mockSoftDelete).toHaveBeenCalledWith('s1', 'user-abc');
      expect(result).toEqual(deleted);
    });

    it('throws NotFoundError when softDelete returns null', async () => {
      const existing = { _id: 's1', name: 'Acme Corp', deletedAt: null };
      mockFindById.mockResolvedValueOnce(existing);
      mockSoftDelete.mockResolvedValueOnce(null);

      await expect(service.delete('s1', 'user-abc')).rejects.toThrow(NotFoundError);
    });
  });
});
