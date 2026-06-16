import { StockAdjustmentService } from '../../../services/StockAdjustmentService';
import { IInventoryRepository } from '../../../repositories/interfaces/IInventoryRepository';
import { StockAdjustmentDto } from '../../../validation/inventory.validation';
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

describe('StockAdjustmentService', () => {
  let service: StockAdjustmentService;
  let repository: IInventoryRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    eventBus = new EventBus({} as any, 'exchange');
    (eventBus.publish as jest.Mock).mockResolvedValue(undefined);
    service = new StockAdjustmentService(repository, eventBus, mockLogger);
  });

  describe('adjustStock', () => {
    it('should successfully record stock adjustment and update inventory', async () => {
      const dto: StockAdjustmentDto = {
        productId: 'product-123',
        quantity: 10, // Add 10 items
        reason: 'Cycle count correction',
      };
      const userId = 'user-999';

      const mockInventoryItem = {
        productId: dto.productId,
        quantity: 15, // Available stock before is 15
        reorderLevel: 5,
        updatedAt: new Date(),
      };

      const mockTx = {
        id: 'adj-abc',
        productId: dto.productId,
        quantity: dto.quantity,
        previousQuantity: 15,
        newQuantity: 25,
        reason: dto.reason,
        adjustedBy: userId,
        createdAt: new Date(),
      };

      mockFindItemByProductId.mockResolvedValueOnce(mockInventoryItem);
      mockCreateStockAdjustmentTransaction.mockResolvedValueOnce(mockTx);
      mockUpsertItem.mockResolvedValueOnce({
        ...mockInventoryItem,
        quantity: 25, // new quantity
      });

      const result = await service.adjustStock(dto, userId);

      expect(mockFindItemByProductId).toHaveBeenCalledWith(dto.productId);
      expect(mockCreateStockAdjustmentTransaction).toHaveBeenCalledWith({
        productId: dto.productId,
        quantity: dto.quantity,
        previousQuantity: 15,
        newQuantity: 25,
        reason: dto.reason,
        adjustedBy: userId,
      });
      expect(mockUpsertItem).toHaveBeenCalledWith(dto.productId, dto.quantity);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'stock.adjustment.created',
        expect.objectContaining({
          stockAdjustmentId: mockTx.id,
          productId: dto.productId,
          quantity: dto.quantity,
          previousQuantity: 15,
          newQuantity: 25,
          reason: dto.reason,
        }),
        expect.any(String)
      );
      expect(result).toEqual(mockTx);
    });

    it('should throw ValidationError if adjustment makes quantity negative', async () => {
      const dto: StockAdjustmentDto = {
        productId: 'product-123',
        quantity: -20, // Try to subtract 20 items
        reason: 'Damaged goods',
      };
      const userId = 'user-999';

      const mockInventoryItem = {
        productId: dto.productId,
        quantity: 15, // Only 15 available
        reorderLevel: 5,
        updatedAt: new Date(),
      };

      mockFindItemByProductId.mockResolvedValueOnce(mockInventoryItem);

      await expect(service.adjustStock(dto, userId)).rejects.toThrow(ValidationError);
      expect(mockCreateStockAdjustmentTransaction).not.toHaveBeenCalled();
      expect(mockUpsertItem).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if reason is empty', async () => {
      const dto = {
        productId: 'product-123',
        quantity: 5,
        reason: '   ',
      } as any;
      const userId = 'user-999';

      await expect(service.adjustStock(dto, userId)).rejects.toThrow(ValidationError);
    });
  });
});
