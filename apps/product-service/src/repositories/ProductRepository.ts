import { IProductRepository } from './interfaces/IProductRepository';
import { IProduct } from '../models/product.model';
import Product from '../models/product.model';

export class ProductRepository implements IProductRepository {
  async create(productData: Partial<IProduct>): Promise<IProduct> {
    return await Product.create(productData);
  }

  async findById(id: string): Promise<IProduct | null> {
    return await Product.findById(id).exec();
  }

  async findBySku(sku: string): Promise<IProduct | null> {
    return await Product.findOne({ sku }).exec();
  }

  async findAll(limit?: number, offset?: number): Promise<IProduct[]> {
    const query = Product.find();
    if (offset) query.skip(offset);
    if (limit) query.limit(limit);
    return await query.exec();
  }

  async update(id: string, productData: Partial<IProduct>): Promise<IProduct | null> {
    return await Product.findByIdAndUpdate(id, productData, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await Product.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
