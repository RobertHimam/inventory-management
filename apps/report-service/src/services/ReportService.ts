import { ProductModel } from '../models/product.model';
import { SaleModel } from '../models/sale.model';
import { ReportCacheModel } from '../models/cache.model';
import { Logger } from '@inventory/shared-logger';

export class ReportService {
  constructor(private readonly logger: Logger) {}

  // EVENT HANDLERS
  async handleProductCreated(payload: unknown): Promise<void> {
    const { product } = payload as { product: { id: string; name: string; sku: string; price: number; cost: number; reorderLevel: number } };
    this.logger.info('Handling product.created in ReportService', { productId: product.id });
    await ProductModel.findOneAndUpdate(
      { productId: product.id },
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        reorderLevel: product.reorderLevel,
        deletedAt: null,
      },
      { upsert: true, new: true }
    );
  }

  async handleProductUpdated(payload: unknown): Promise<void> {
    const { product } = payload as { product: { id: string; name: string; sku: string; price: number; cost: number; reorderLevel: number } };
    this.logger.info('Handling product.updated in ReportService', { productId: product.id });
    await ProductModel.findOneAndUpdate(
      { productId: product.id },
      {
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        reorderLevel: product.reorderLevel,
      }
    );
  }

  async handleProductDeleted(payload: unknown): Promise<void> {
    const { productId } = payload as { productId: string };
    this.logger.info('Handling product.deleted in ReportService', { productId });
    await ProductModel.findOneAndUpdate(
      { productId },
      { deletedAt: new Date() }
    );
  }

  async handleStockIn(payload: unknown): Promise<void> {
    const { productId, quantity } = payload as { productId: string; quantity: number };
    this.logger.info('Handling stock.in.created in ReportService', { productId, quantity });
    await ProductModel.findOneAndUpdate(
      { productId },
      { $inc: { quantity: quantity } }
    );
    // Invalidate valuation cache
    await this.invalidateCache('inventory-valuation');
  }

  async handleStockOut(payload: unknown): Promise<void> {
    const { productId, quantity, userId } = payload as { productId: string; quantity: number; userId: string; createdAt?: Date };
    this.logger.info('Handling stock.out.created in ReportService', { productId, quantity });
    
    // Find product to get price
    const product = await ProductModel.findOne({ productId });
    const price = product ? product.price : 0;
    const productName = product ? product.name : 'Unknown Product';
    
    await ProductModel.findOneAndUpdate(
      { productId },
      { $inc: { quantity: -quantity } }
    );

    // Record sale
    await SaleModel.create({
      productId,
      productName,
      quantity,
      price,
      totalAmount: quantity * price,
      soldBy: userId,
      createdAt: payload.createdAt || new Date(),
    });

    // Invalidate sales and dashboard caches
    await this.invalidateCache('sales|dashboard');
  }

  async handleStockAdjustment(payload: unknown): Promise<void> {
    const { productId, newQuantity } = payload as { productId: string; newQuantity: number };
    this.logger.info('Handling stock.adjustment.created in ReportService', { productId, newQuantity });
    await ProductModel.findOneAndUpdate(
      { productId },
      { quantity: newQuantity }
    );
    // Invalidate all caches
    await this.invalidateAllCaches();
  }

  async handleStockLowDetected(payload: unknown): Promise<void> {
    const { productId } = payload as { productId: string };
    this.logger.info('Handling stock.low.detected in ReportService', { productId });
    // Invalidate low stock cache
    await this.invalidateCache('low-stock');
  }

  // REPORT CALCULATIONS
  async getDashboardMetrics(): Promise<Record<string, unknown>> {
    const products = await ProductModel.find({ deletedAt: null });
    
    let totalProducts = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;

    for (const p of products) {
      totalProducts++;
      totalInventoryValue += p.quantity * p.price;
      if (p.quantity <= p.reorderLevel) {
        lowStockCount++;
      }
    }

    return {
      totalProducts,
      totalInventoryValue,
      lowStockCount,
    };
  }

  async getSalesReport(startDate?: string, endDate?: string): Promise<Record<string, unknown>> {
    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      filter.createdAt = dateFilter;
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
    }

    const sales = await SaleModel.find(filter).sort({ createdAt: -1 });
    
    let totalSalesAmount = 0;
    let totalQuantitySold = 0;

    for (const s of sales) {
      totalSalesAmount += s.totalAmount;
      totalQuantitySold += s.quantity;
    }

    return {
      sales,
      totalSalesAmount,
      totalQuantitySold,
    };
  }

  async getInventoryValuation(): Promise<Record<string, unknown>> {
    const products = await ProductModel.find({ deletedAt: null });

    const valuations = products.map((p) => ({
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      cost: p.cost,
      price: p.price,
      costValuation: p.quantity * p.cost,
      retailValuation: p.quantity * p.price,
    }));

    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    for (const v of valuations) {
      totalCostValuation += v.costValuation;
      totalRetailValuation += v.retailValuation;
    }

    return {
      valuations,
      totalCostValuation,
      totalRetailValuation,
    };
  }

  async getLowStockReport(): Promise<Record<string, unknown>> {
    const products = await ProductModel.find({ deletedAt: null });
    const lowStockItems = products.filter((p) => p.quantity <= p.reorderLevel);
    
    return {
      lowStockItems,
    };
  }

  // CACHING UTILITIES
  async getCachedReport(key: string): Promise<unknown> {
    const cached = await ReportCacheModel.findOne({ key });
    return cached ? cached.data : null;
  }

  async setCachedReport(key: string, data: unknown): Promise<void> {
    await ReportCacheModel.findOneAndUpdate(
      { key },
      { key, data, createdAt: new Date() },
      { upsert: true, new: true }
    );
  }

  async invalidateCache(pattern: string): Promise<void> {
    this.logger.info(`Invalidating caches matching pattern: ${pattern}`);
    await ReportCacheModel.deleteMany({ key: { $regex: pattern } });
  }

  async invalidateAllCaches(): Promise<void> {
    this.logger.info('Invalidating all caches');
    await ReportCacheModel.deleteMany({});
  }
}
