import { ICategory } from '../../models/category.model';

export interface CategoryFindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CategoryFindAllResult {
  data: ICategory[];
  total: number;
}

export interface ICategoryRepository {
  create(data: Pick<ICategory, 'name' | 'description'>): Promise<ICategory>;
  findById(id: string): Promise<ICategory | null>;
  findByName(name: string): Promise<ICategory | null>;
  findAll(options: CategoryFindAllOptions): Promise<CategoryFindAllResult>;
  update(id: string, data: Partial<Pick<ICategory, 'name' | 'description'>>): Promise<ICategory | null>;
  softDelete(id: string, deletedBy: string): Promise<ICategory | null>;
}
