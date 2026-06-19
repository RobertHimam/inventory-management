import { IInventoryRepository } from '../repositories/interfaces/IInventoryRepository';
import { ListInventoryQueryDto, listInventoryQuerySchema } from '../validation/inventory.validation';
import { ValidationError, NotFoundError } from '../errors';

export class InventoryService {
  constructor(private readonly repository: IInventoryRepository) {}

  async getItemByProductId(productId: string): Promise<unknown> {
    const item = await this.repository.findItemByProductId(productId);
    if (!item) {
      throw new NotFoundError(`Inventory item not found for product: ${productId}`);
    }
    return item;
  }

  async listItems(query: ListInventoryQueryDto): Promise<Record<string, unknown>> {
    const validationResult = listInventoryQuerySchema.safeParse(query);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid list query parameters: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const validatedQuery = validationResult.data;
    const { page, limit } = validatedQuery;

    const result = await this.repository.findAll(validatedQuery);
    const totalPages = Math.ceil(result.total / limit);

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: totalPages === 0 ? 1 : totalPages,
      },
    };
  }
}
