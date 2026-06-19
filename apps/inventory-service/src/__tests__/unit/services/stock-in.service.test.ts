/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { StockInService } from '../../../services/StockInService';
import { IInventoryRepository } from '../../../repositories/interfaces/IInventoryRepository';
import { StockInDto } from '../../../validation/inventory.validation';
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

describe('StockInService', () => {
  let service: StockInService;
  let repository: IInventoryRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    eventBus = new EventBus({} as any, 'exchange');
    (eventBus.publish as jest.Mock).mockResolvedValue(undefined);
    service = new StockInService(repository, eventBus, mockLogger);
  });

  describe('stockIn', () => {
    it('should successfully record stock in and update inventory', async () => {
      const dto: StockInDto = {
        productId: 'product-123',
        quantity: 15,
      };
      const userId = 'user-999';

      const mockTx = {
        id: 'si-abc',
        productId: dto.productId,
        quantity: dto.quantity,
        createdBy: userId,
        createdAt: new Date(),
      };

      const mockInventoryItem = {
        productId: dto.productId,
        quantity: 15,
        updatedAt: new Date(),
      };

      mockCreateStockInTransaction.mockResolvedValueOnce(mockTx);
      mockUpsertItem.mockResolvedValueOnce(mockInventoryItem);

      const result = await service.stockIn(dto, userId);

      expect(mockCreateStockInTransaction).toHaveBeenCalledWith({
        productId: dto.productId,
        quantity: dto.quantity,
        createdBy: userId,
      });
      expect(mockUpsertItem).toHaveBeenCalledWith(dto.productId, dto.quantity);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'stock.in.created',
        expect.objectContaining({
          stockInId: mockTx.id,
          productId: dto.productId,
          quantity: dto.quantity,
        }),
        expect.any(String)
      );
      expect(result).toEqual(mockTx);
    });

    it('should throw ValidationError if quantity is negative', async () => {
      const dto = {
        productId: 'product-123',
        quantity: -5,
      } as any;
      const userId = 'user-999';

      await expect(service.stockIn(dto, userId)).rejects.toThrow(ValidationError);
      expect(mockCreateStockInTransaction).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if productId is empty', async () => {
      const dto = {
        productId: '',
        quantity: 10,
      } as any;
      const userId = 'user-999';

      await expect(service.stockIn(dto, userId)).rejects.toThrow(ValidationError);
      expect(mockCreateStockInTransaction).not.toHaveBeenCalled();
    });
  });
});
