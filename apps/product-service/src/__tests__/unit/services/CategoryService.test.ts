/* eslint-disable @typescript-eslint/no-explicit-any */
import { CategoryService } from '../../../services/CategoryService';
import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { ValidationError, NotFoundError, ConflictError } from '../../../errors';

// Mock the repository methods
const mockCreate = jest.fn();
const mockFindById = jest.fn();
const mockFindByName = jest.fn();
const mockFindAll = jest.fn();
const mockUpdate = jest.fn();
const mockSoftDelete = jest.fn();

const createMockRepository = (): CategoryRepository =>
  ({
    create: mockCreate,
    findById: mockFindById,
    findByName: mockFindByName,
    findAll: mockFindAll,
    update: mockUpdate,
    softDelete: mockSoftDelete,
  } as unknown as CategoryRepository);

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    const repo = createMockRepository();
    service = new CategoryService(repo);
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('returns paginated results with correct metadata', async () => {
      // Arrange
      const mockCategories = [
        { _id: 'cat1', name: 'Electronics' },
        { _id: 'cat2', name: 'Clothing' },
      ];
      mockFindAll.mockResolvedValueOnce({ data: mockCategories, total: 25 });

      // Act
      const result = await service.list({ page: 3, limit: 2 });

      // Assert
      expect(mockFindAll).toHaveBeenCalledWith({ page: 3, limit: 2 });
      expect(result.data).toEqual(mockCategories);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 2,
        total: 25,
        totalPages: 13,
      });
    });

    it('uses default page=1 and limit=10 when not provided', async () => {
      // Arrange
      mockFindAll.mockResolvedValueOnce({ data: [], total: 0 });

      // Act
      const result = await service.list({});

      // Assert
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('returns totalPages=0 when limit is 0', async () => {
      // Arrange
      mockFindAll.mockResolvedValueOnce({ data: [], total: 5 });

      // Act
      const result = await service.list({ page: 1, limit: 0 });

      // Assert
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('returns the category when found', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', deletedAt: null };
      mockFindById.mockResolvedValueOnce(mockCategory);

      // Act
      const result = await service.getById('cat1');

      // Assert
      expect(mockFindById).toHaveBeenCalledWith('cat1');
      expect(result).toEqual(mockCategory);
    });

    it('throws NotFoundError when category does not exist', async () => {
      // Arrange
      mockFindById.mockResolvedValue(null);

      // Act — capture the same promise to avoid calling the service twice
      const promise = service.getById('nonexistent-id');

      // Assert
      await expect(promise).rejects.toThrow(NotFoundError);
      await expect(promise).rejects.toThrow("Category 'nonexistent-id' not found");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('throws ValidationError for empty name', async () => {
      // Arrange
      const dto = { name: '' };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ValidationError when name is missing entirely', async () => {
      // Arrange
      const dto = { description: 'Some description' };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ValidationError when name exceeds 100 characters', async () => {
      // Arrange
      const dto = { name: 'A'.repeat(101) };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ConflictError when category name already exists and is active', async () => {
      // Arrange
      const dto = { name: 'Electronics' };
      mockFindByName.mockResolvedValue({ _id: 'cat1', name: 'Electronics', deletedAt: null });

      // Act & Assert — single call, captured as a rejected promise
      const promise = service.create(dto);
      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toThrow("Category 'Electronics' already exists");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('succeeds and creates category when name is unique', async () => {
      // Arrange
      const dto = { name: 'Electronics', description: 'Consumer electronics' };
      mockFindByName.mockResolvedValueOnce(null);
      const createdCategory = { _id: 'cat1', name: 'Electronics', description: 'Consumer electronics', deletedAt: null };
      mockCreate.mockResolvedValueOnce(createdCategory);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockFindByName).toHaveBeenCalledWith('Electronics');
      expect(mockCreate).toHaveBeenCalledWith({ name: 'Electronics', description: 'Consumer electronics' });
      expect(result).toEqual(createdCategory);
    });

    it('succeeds when existing category with same name has been soft-deleted', async () => {
      // Arrange
      const dto = { name: 'Electronics' };
      mockFindByName.mockResolvedValueOnce({ _id: 'cat-old', name: 'Electronics', deletedAt: new Date() });
      const createdCategory = { _id: 'cat2', name: 'Electronics', deletedAt: null };
      mockCreate.mockResolvedValueOnce(createdCategory);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqual(createdCategory);
    });

    it('throws ValidationError for non-object input (null)', async () => {
      await expect(service.create(null)).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('throws ValidationError for non-object input (string)', async () => {
      await expect(service.create('invalid')).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    const existingCategory = { _id: 'cat1', name: 'Electronics', deletedAt: null };

    it('throws NotFoundError when category not found', async () => {
      // Arrange
      mockFindById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.update('nonexistent-id', { name: 'New Name' })).rejects.toThrow(NotFoundError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws ConflictError when new name is already taken by another active category', async () => {
      // Arrange
      mockFindById.mockResolvedValue(existingCategory);
      mockFindByName.mockResolvedValue({ _id: 'cat2', name: 'Clothing', deletedAt: null });

      // Act — capture promise once to test both message and type
      const promise = service.update('cat1', { name: 'Clothing' });

      // Assert
      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toThrow("Category 'Clothing' already exists");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('succeeds when updating to the same name (no conflict)', async () => {
      // Arrange
      mockFindById.mockResolvedValueOnce(existingCategory);
      const updatedCategory = { ...existingCategory, description: 'Updated desc' };
      mockUpdate.mockResolvedValueOnce(updatedCategory);

      // Act
      const result = await service.update('cat1', { name: 'Electronics', description: 'Updated desc' });

      // Assert
      // findByName should NOT be called since name didn't change
      expect(mockFindByName).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith('cat1', { name: 'Electronics', description: 'Updated desc' });
      expect(result).toEqual(updatedCategory);
    });

    it('succeeds for valid data with a new unique name', async () => {
      // Arrange
      mockFindById.mockResolvedValueOnce(existingCategory);
      mockFindByName.mockResolvedValueOnce(null);
      const updatedCategory = { ...existingCategory, name: 'Gadgets' };
      mockUpdate.mockResolvedValueOnce(updatedCategory);

      // Act
      const result = await service.update('cat1', { name: 'Gadgets' });

      // Assert
      expect(mockFindByName).toHaveBeenCalledWith('Gadgets');
      expect(mockUpdate).toHaveBeenCalledWith('cat1', { name: 'Gadgets' });
      expect(result).toEqual(updatedCategory);
    });

    it('throws NotFoundError when repo.update returns null', async () => {
      // Arrange
      mockFindById.mockResolvedValueOnce(existingCategory);
      mockUpdate.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.update('cat1', { description: 'desc' })).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError for invalid dto (name too long)', async () => {
      // Arrange
      mockFindById.mockResolvedValueOnce(existingCategory);

      // Act & Assert
      await expect(service.update('cat1', { name: 'A'.repeat(101) })).rejects.toThrow(ValidationError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('throws NotFoundError when category does not exist', async () => {
      // Arrange
      mockFindById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.delete('nonexistent-id', 'user-abc')).rejects.toThrow(NotFoundError);
      expect(mockSoftDelete).not.toHaveBeenCalled();
    });

    it('calls softDelete with the correct id and deletedBy', async () => {
      // Arrange
      const existingCategory = { _id: 'cat1', name: 'Electronics', deletedAt: null };
      const deletedCategory = { ...existingCategory, deletedAt: new Date(), deletedBy: 'user-abc' };
      mockFindById.mockResolvedValueOnce(existingCategory);
      mockSoftDelete.mockResolvedValueOnce(deletedCategory);

      // Act
      const result = await service.delete('cat1', 'user-abc');

      // Assert
      expect(mockSoftDelete).toHaveBeenCalledWith('cat1', 'user-abc');
      expect(result).toEqual(deletedCategory);
    });

    it('throws NotFoundError when softDelete returns null', async () => {
      // Arrange
      const existingCategory = { _id: 'cat1', name: 'Electronics', deletedAt: null };
      mockFindById.mockResolvedValueOnce(existingCategory);
      mockSoftDelete.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.delete('cat1', 'user-abc')).rejects.toThrow(NotFoundError);
    });
  });
});
