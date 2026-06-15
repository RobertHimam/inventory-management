import { IProduct } from '../../models/product.model';

export interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FindAllResult {
  data: IProduct[];
  total: number;
}

export interface IProductRepository {
  create(productData: Partial<IProduct>): Promise<IProduct>;
  findById(id: string): Promise<IProduct | null>;
  findBySku(sku: string): Promise<IProduct | null>;
  findAll(options: FindAllOptions): Promise<FindAllResult>;
  update(id: string, productData: Partial<IProduct>): Promise<IProduct | null>;
  delete(id: string, deletedBy: string): Promise<IProduct | null>;
}
