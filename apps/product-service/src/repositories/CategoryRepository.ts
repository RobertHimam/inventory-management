import Category from '../models/category.model';
import {
  ICategoryRepository,
  CategoryFindAllOptions,
  CategoryFindAllResult,
} from './interfaces/ICategoryRepository';
import { ICategory } from '../models/category.model';

export class CategoryRepository implements ICategoryRepository {
  async create(data: Pick<ICategory, 'name' | 'description'>): Promise<ICategory> {
    return Category.create(data);
  }

  async findById(id: string): Promise<ICategory | null> {
    return Category.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findByName(name: string): Promise<ICategory | null> {
    return Category.findOne({ name }).exec();
  }

  async findAll(options: CategoryFindAllOptions): Promise<CategoryFindAllResult> {
    const { page = 1, limit = 10, search, sort = 'createdAt', order = 'desc' } = options;

    const query: Record<string, unknown> = { deletedAt: null };
    if (search) {
      query['name'] = { $regex: search, $options: 'i' };
    }

    const sortOptions = { [sort]: order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Category.find(query).sort(sortOptions).skip(skip).limit(limit).exec(),
      Category.countDocuments(query),
    ]);

    return { data, total };
  }

  async update(id: string, data: Partial<Pick<ICategory, 'name' | 'description'>>): Promise<ICategory | null> {
    return Category.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).exec();
  }

  async softDelete(id: string, deletedBy: string): Promise<ICategory | null> {
    return Category.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), deletedBy },
      { new: true }
    ).exec();
  }
}
