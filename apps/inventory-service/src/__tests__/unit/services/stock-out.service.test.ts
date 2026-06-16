import { StockOutService } from '../../../services/StockOutService';
import { IInventoryRepository } from '../../../repositories/interfaces/IInventoryRepository';
import { StockOutDto } from '../../../validation/inventory.validation';
import { ValidationError } from '../../../errors';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger } from '@inventory/shared-logger';

// Mock EventBus
jest.mock('@inventory/shared-rabbitmq');

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setCorrelationId: jest.fn(),
} as unknown as jest.Mocked<Logger>;

const mockFindItemByProductId = jest.fn();
const mockUpsertItem = jest.fn();
const mockCreateStockInTransaction = jest.fn();
const mockCreateStockOutTransaction = jest.fn();
const mockCreateStockAdjustmentTransaction = jest.fn();

const createMockRepository = (): IInventoryRepository => ({
  findItemByProductId: mockFindItemByProductId,
  upsertItem: mockUpsertItem,
  findAll: jest.fn(),
  createStockInTransaction: mockCreateStockInTransaction,
  createStockOutTransaction: mockCreateStockOutTransaction,
  createStockAdjustmentTransaction: mockCreateStockAdjustmentTransaction,
});

describe('StockOutService', () => {
  let service: StockOutService;
  let repository: IInventoryRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    eventBus = new EventBus({} as any, 'exchange');
    (eventBus.publish as jest.Mock).mockResolvedValue(undefined);
    service = new StockOutService(repository, eventBus, mockLogger);
  });

  describe('stockOut', () => {
    it('should successfully record stock out and decrement inventory', async () => {
      const dto: StockOutDto = {
        productId: 'product-123',
        quantity: 10,
      };
      const userId = 'user-999';

      const mockInventoryItem = {
        productId: dto.productId,
        quantity: 25, // Available stock is 25
        reorderLevel: 5,
        updatedAt: new Date(),
      };

      const mockTx = {
        id: 'so-abc',
        productId: dto.productId,
        quantity: dto.quantity,
        createdBy: userId,
        createdAt: new Date(),
      };

      mockFindItemByProductId.mockResolvedValueOnce(mockInventoryItem);
      mockCreateStockOutTransaction.mockResolvedValueOnce(mockTx);
      mockUpsertItem.mockResolvedValueOnce({
        ...mockInventoryItem,
        quantity: 15, // new quantity
      });

      const result = await service.stockOut(dto, userId);

      expect(mockFindItemByProductId).toHaveBeenCalledWith(dto.productId);
      expect(mockCreateStockOutTransaction).toHaveBeenCalledWith({
        productId: dto.productId,
        quantity: dto.quantity,
        createdBy: userId,
      });
      expect(mockUpsertItem).toHaveBeenCalledWith(dto.productId, -dto.quantity);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'stock.out.created',
        expect.objectContaining({
          stockOutId: mockTx.id,
          productId: dto.productId,
          quantity: dto.quantity,
        }),
        expect.any(String)
      );
      expect(result).toEqual(mockTx);
    });

    it('should throw ValidationError if insufficient stock is available', async () => {
      const dto: StockOutDto = {
        productId: 'product-123',
        quantity: 30,
      };
      const userId = 'user-999';

      const mockInventoryItem = {
        productId: dto.productId,
        quantity: 20, // Available stock only 20
        reorderLevel: 5,
        updatedAt: new Date(),
      };

      mockFindItemByProductId.mockResolvedValueOnce(mockInventoryItem);

      await expect(service.stockOut(dto, userId)).rejects.toThrow(ValidationError);
      expect(mockCreateStockOutTransaction).not.toHaveBeenCalled();
      expect(mockUpsertItem).not.toHaveBeenCalled();
    });

    it('should publish stock.low.detected if new quantity is at or below reorderLevel', async () => {
      const dto: StockOutDto = {
        productId: 'product-123',
        quantity: 15,
      };
      const userId = 'user-999';

      const mockInventoryItem = {
        productId: dto.productId,
        quantity: 20, // Available stock is 20
        reorderLevel: 10,
        updatedAt: new Date(),
      };

      const mockTx = {
        id: 'so-abc',
        productId: dto.productId,
        quantity: dto.quantity,
        createdBy: userId,
        createdAt: new Date(),
      };

      mockFindItemByProductId.mockResolvedValueOnce(mockInventoryItem);
      mockCreateStockOutTransaction.mockResolvedValueOnce(mockTx);
      mockUpsertItem.mockResolvedValueOnce({
        ...mockInventoryItem,
        quantity: 5, // 20 - 15 = 5 (which is <= 10)
      });

      await service.stockOut(dto, userId);

      expect(eventBus.publish).toHaveBeenCalledWith(
        'stock.low.detected',
        expect.objectContaining({
          productId: dto.productId,
          currentQuantity: 5,
          reorderLevel: 10,
        }),
        expect.any(String)
      );
    });
  });
});
