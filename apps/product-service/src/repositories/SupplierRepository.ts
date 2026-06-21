import Supplier from '../models/supplier.model';
import {
  ISupplierRepository,
  SupplierFindAllOptions,
  SupplierFindAllResult,
} from './interfaces/ISupplierRepository';
import { ISupplier } from '../models/supplier.model';

export class SupplierRepository implements ISupplierRepository {
  async create(data: Pick<ISupplier, 'name' | 'contactEmail' | 'phone' | 'address'>): Promise<ISupplier> {
    return Supplier.create(data);
  }

  async findById(id: string): Promise<ISupplier | null> {
    return Supplier.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findByName(name: string): Promise<ISupplier | null> {
    return Supplier.findOne({ name }).exec();
  }

  async findAll(options: SupplierFindAllOptions): Promise<SupplierFindAllResult> {
    const { page = 1, limit = 10, search, sort = 'createdAt', order = 'desc' } = options;

    const query: Record<string, unknown> = { deletedAt: null };
    if (search) {
      query['name'] = { $regex: search, $options: 'i' };
    }

    const sortOptions = { [sort]: order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Supplier.find(query).sort(sortOptions).skip(skip).limit(limit).exec(),
      Supplier.countDocuments(query),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: Partial<Pick<ISupplier, 'name' | 'contactEmail' | 'phone' | 'address'>>
  ): Promise<ISupplier | null> {
    return Supplier.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).exec();
  }

  async softDelete(id: string, deletedBy: string): Promise<ISupplier | null> {
    return Supplier.findByIdAndUpdate(id, { deletedAt: new Date(), deletedBy }, { new: true }).exec();
  }
}
