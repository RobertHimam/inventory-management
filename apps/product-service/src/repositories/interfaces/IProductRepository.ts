import { IProduct } from '../models/product.model';

export interface IProductRepository {
  create(productData: Partial<IProduct>): Promise<IProduct>;
  findById(id: string): Promise<IProduct | null>;
  findBySku(sku: string): Promise<IProduct | null>;
  findAll(limit?: number, offset?: number): Promise<IProduct[]>;
  update(id: string, productData: Partial<IProduct>): Promise<IProduct | null>;
  delete(id: string): Promise<boolean>;
}
