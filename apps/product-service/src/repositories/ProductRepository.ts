import { IProductRepository, FindAllOptions, FindAllResult } from './interfaces/IProductRepository';
import { IProduct } from '../models/product.model';
import Product from '../models/product.model';

export class ProductRepository implements IProductRepository {
  async create(productData: Partial<IProduct>): Promise<IProduct> {
    return await Product.create(productData);
  }

  async findById(id: string): Promise<IProduct | null> {
    return await Product.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findBySku(sku: string): Promise<IProduct | null> {
    return await Product.findOne({ sku }).exec();
  }

  async findAll(options: FindAllOptions): Promise<FindAllResult> {
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
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions: Record<string, number> = { [sort]: sortOrder };

    const skip = (page - 1) * limit;

    const dataQuery = Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      dataQuery.exec(),
      Product.countDocuments(query),
    ]);

    return { data, total };
  }

  async update(id: string, productData: Partial<IProduct>): Promise<IProduct | null> {
    return await Product.findByIdAndUpdate(id, productData, { new: true }).exec();
  }

  async delete(id: string, deletedBy: string): Promise<IProduct | null> {
    const result = await Product.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), deletedBy },
      { new: true }
    ).exec();
    return result;
  }
}
