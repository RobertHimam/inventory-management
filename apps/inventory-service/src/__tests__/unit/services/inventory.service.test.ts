import { InventoryService } from '../../../services/InventoryService';
import { IInventoryRepository } from '../../../repositories/interfaces/IInventoryRepository';
import { NotFoundError } from '../../../errors';

const mockFindItemByProductId = jest.fn();
const mockUpsertItem = jest.fn();
const mockFindAll = jest.fn();

const createMockRepository = (): IInventoryRepository => ({
  findItemByProductId: mockFindItemByProductId,
  upsertItem: mockUpsertItem,
  findAll: mockFindAll,
  createStockInTransaction: jest.fn(),
  createStockOutTransaction: jest.fn(),
  createStockAdjustmentTransaction: jest.fn(),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: IInventoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    service = new InventoryService(repository);
  });

  describe('getItemByProductId', () => {
    it('should return item details if found', async () => {
      const mockItem = {
        productId: 'prod-1',
        quantity: 10,
        reorderLevel: 5,
        updatedAt: new Date(),
      };
      mockFindItemByProductId.mockResolvedValueOnce(mockItem);

      const result = await service.getItemByProductId('prod-1');

      expect(mockFindItemByProductId).toHaveBeenCalledWith('prod-1');
      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundError if item is not found', async () => {
      mockFindItemByProductId.mockResolvedValueOnce(null);

      await expect(service.getItemByProductId('prod-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listItems', () => {
    it('should return paginated list of items', async () => {
      const query = { page: 1, limit: 5, sort: 'createdAt', order: 'desc' as const };
      const mockResult = {
        data: [
          { productId: 'prod-1', quantity: 10, reorderLevel: 5, updatedAt: new Date() },
          { productId: 'prod-2', quantity: 20, reorderLevel: 5, updatedAt: new Date() },
        ],
        total: 2,
      };
      mockFindAll.mockResolvedValueOnce(mockResult);

      const result = await service.listItems(query);

      expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        limit: 5,
      }));
      expect(result.data).toEqual(mockResult.data);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 2,
        totalPages: 1,
      });
    });
  });
});
