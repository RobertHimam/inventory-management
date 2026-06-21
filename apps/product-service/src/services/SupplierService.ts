import { SupplierRepository, SupplierFindAllOptions } from '../repositories/SupplierRepository';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  contactEmail: z.string().email().max(254).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  contactEmail: z.string().email().max(254).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

export class SupplierService {
  constructor(private readonly repo: SupplierRepository) {}

  async list(options: SupplierFindAllOptions) {
    const { data, total } = await this.repo.findAll(options);
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async getById(id: string) {
    const supplier = await this.repo.findById(id);
    if (!supplier) throw new NotFoundError(`Supplier '${id}' not found`);
    return supplier;
  }

  async create(dto: unknown) {
    const parsed = createSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(`Invalid supplier data: ${JSON.stringify(parsed.error.errors)}`);
    }
    const existing = await this.repo.findByName(parsed.data.name);
    if (existing && !existing.deletedAt) {
      throw new ConflictError(`Supplier '${parsed.data.name}' already exists`);
    }
    return this.repo.create(parsed.data);
  }

  async update(id: string, dto: unknown) {
    const parsed = updateSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(`Invalid supplier data: ${JSON.stringify(parsed.error.errors)}`);
    }
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Supplier '${id}' not found`);
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const dupe = await this.repo.findByName(parsed.data.name);
      if (dupe && !dupe.deletedAt) throw new ConflictError(`Supplier '${parsed.data.name}' already exists`);
    }
    const updated = await this.repo.update(id, parsed.data);
    if (!updated) throw new NotFoundError(`Supplier '${id}' not found`);
    return updated;
  }

  async delete(id: string, deletedBy: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Supplier '${id}' not found`);
    const deleted = await this.repo.softDelete(id, deletedBy);
    if (!deleted) throw new NotFoundError(`Supplier '${id}' not found`);
    return deleted;
  }
}
