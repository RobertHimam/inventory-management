import { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryFindAllOptions } from '../repositories/interfaces/ICategoryRepository';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export class CategoryService {
  constructor(private readonly repo: CategoryRepository) {}

  async list(options: CategoryFindAllOptions) {
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
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError(`Category '${id}' not found`);
    return category;
  }

  async create(dto: unknown) {
    const parsed = createSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(`Invalid category data: ${JSON.stringify(parsed.error.errors)}`);
    }
    const existing = await this.repo.findByName(parsed.data.name);
    if (existing && !existing.deletedAt) {
      throw new ConflictError(`Category '${parsed.data.name}' already exists`);
    }
    return this.repo.create(parsed.data);
  }

  async update(id: string, dto: unknown) {
    const parsed = updateSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(`Invalid category data: ${JSON.stringify(parsed.error.errors)}`);
    }
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Category '${id}' not found`);
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const dupe = await this.repo.findByName(parsed.data.name);
      if (dupe && !dupe.deletedAt) throw new ConflictError(`Category '${parsed.data.name}' already exists`);
    }
    const updated = await this.repo.update(id, parsed.data);
    if (!updated) throw new NotFoundError(`Category '${id}' not found`);
    return updated;
  }

  async delete(id: string, deletedBy: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Category '${id}' not found`);
    const deleted = await this.repo.softDelete(id, deletedBy);
    if (!deleted) throw new NotFoundError(`Category '${id}' not found`);
    return deleted;
  }
}
