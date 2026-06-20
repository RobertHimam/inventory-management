import { IInventoryRepository, FindAllInventoryOptions, FindAllInventoryResult } from './interfaces/IInventoryRepository';
import InventoryItemModel from '../models/inventory-item.model';
import StockTransactionModel from '../models/stock-transaction.model';
import { InventoryItem, StockIn, StockOut, StockAdjustment } from '@inventory/shared-types';

export class InventoryRepository implements IInventoryRepository {
  async findItemByProductId(productId: string): Promise<(InventoryItem & { reorderLevel?: number; productName?: string; sku?: string }) | null> {
    const doc = await InventoryItemModel.findOne({ productId, deletedAt: null }).exec();
    if (!doc) return null;
    return {
      productId: doc.productId,
      quantity: doc.quantity,
      reorderLevel: doc.reorderLevel,
      productName: doc.productName,
      sku: doc.sku,
      updatedAt: doc.updatedAt,
    };
  }

  async upsertItem(productId: string, quantityChange: number): Promise<InventoryItem & { reorderLevel?: number; productName?: string; sku?: string }> {
    const doc = await InventoryItemModel.findOneAndUpdate(
      { productId },
      { $inc: { quantity: quantityChange } },
      { new: true, upsert: true }
    ).exec();

    return {
      productId: doc.productId,
      quantity: doc.quantity,
      reorderLevel: doc.reorderLevel,
      productName: doc.productName,
      sku: doc.sku,
      updatedAt: doc.updatedAt,
    };
  }

  async findAll(options: FindAllInventoryOptions): Promise<FindAllInventoryResult> {
    const {
      page = 1,
      limit = 10,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = options;

    const query: Record<string, unknown> = { deletedAt: null };

    if (search) {
      query.$or = [
        { productId: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions: { [key: string]: 1 | -1 } = { [sort]: sortOrder };

    const skip = (page - 1) * limit;

    const dataQuery = InventoryItemModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      dataQuery.exec(),
      InventoryItemModel.countDocuments(query),
    ]);

    // Map Mongoose documents to standard objects
    const formattedData = data.map((doc) => ({
      productId: doc.productId,
      quantity: doc.quantity,
      reorderLevel: doc.reorderLevel,
      productName: doc.productName,
      sku: doc.sku,
      updatedAt: doc.updatedAt,
    }));

    return { data: formattedData, total };
  }

  async createStockInTransaction(data: {
    productId: string;
    quantity: number;
    createdBy: string;
  }): Promise<StockIn> {
    const doc = await StockTransactionModel.create({
      productId: data.productId,
      type: 'IN',
      quantity: data.quantity,
      createdBy: data.createdBy,
    });

    return {
      id: doc._id.toString(),
      productId: doc.productId,
      quantity: doc.quantity,
      createdAt: doc.createdAt,
      createdBy: doc.createdBy,
    };
  }

  async createStockOutTransaction(data: {
    productId: string;
    quantity: number;
    createdBy: string;
  }): Promise<StockOut> {
    const doc = await StockTransactionModel.create({
      productId: data.productId,
      type: 'OUT',
      quantity: data.quantity,
      createdBy: data.createdBy,
    });

    return {
      id: doc._id.toString(),
      productId: doc.productId,
      quantity: doc.quantity,
      createdAt: doc.createdAt,
      createdBy: doc.createdBy,
    };
  }

  async createStockAdjustmentTransaction(data: {
    productId: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    adjustedBy: string;
  }): Promise<StockAdjustment> {
    const doc = await StockTransactionModel.create({
      productId: data.productId,
      type: 'ADJUST',
      quantity: Math.abs(data.quantity), // Store absolute quantity in the tx log, type handles direction
      reason: data.reason,
      createdBy: data.adjustedBy,
    });

    return {
      id: doc._id.toString(),
      productId: doc.productId,
      quantity: data.quantity, // actual positive/negative change amount
      previousQuantity: data.previousQuantity,
      newQuantity: data.newQuantity,
      reason: data.reason,
      adjustedBy: doc.createdBy,
      createdAt: doc.createdAt,
    };
  }
}
