import { ISupplier } from '../../models/supplier.model';

export interface SupplierFindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SupplierFindAllResult {
  data: ISupplier[];
  total: number;
}

export interface ISupplierRepository {
  create(data: Pick<ISupplier, 'name' | 'contactEmail' | 'phone' | 'address'>): Promise<ISupplier>;
  findById(id: string): Promise<ISupplier | null>;
  findByName(name: string): Promise<ISupplier | null>;
  findAll(options: SupplierFindAllOptions): Promise<SupplierFindAllResult>;
  update(
    id: string,
    data: Partial<Pick<ISupplier, 'name' | 'contactEmail' | 'phone' | 'address'>>
  ): Promise<ISupplier | null>;
  softDelete(id: string, deletedBy: string): Promise<ISupplier | null>;
}
