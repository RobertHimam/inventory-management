import { IProductRepository } from '../repositories/interfaces/IProductRepository';
import { CreateProductDto, UpdateProductDto } from '../validation/product.validation';
import { createProductSchema, updateProductSchema } from '../validation/product.validation';
import { ConflictError, DatabaseError, ValidationError, NotFoundError } from '../errors';

export class ProductService {
  constructor(private readonly repository: IProductRepository) {}

  async createProduct(dto: CreateProductDto): Promise<any> {
    // 1. Validate DTO
    const validationResult = createProductSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid product data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const validatedDto = validationResult.data;

    // 2. Check for duplicate SKU
    const existing = await this.repository.findBySku(validatedDto.sku);
    if (existing) {
      throw new ConflictError(`Product with SKU '${validatedDto.sku}' already exists`);
    }

    // 3. Create product
    try {
      const product = await this.repository.create(validatedDto);
      return product;
    } catch (error) {
      throw new DatabaseError(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<any> {
    // 1. Validate DTO (allow partial)
    const validationResult = updateProductSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid product data: ${JSON.stringify(validationResult.error.errors)}`
      );
    }

    const validatedDto = validationResult.data;

    // 2. Check if product exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    // 3. Check for SKU conflict if SKU is being updated
    if (validatedDto.sku && validatedDto.sku !== existing.sku) {
      const duplicate = await this.repository.findBySku(validatedDto.sku);
      if (duplicate && duplicate._id.toString() !== id) {
        throw new ConflictError(`Product with SKU '${validatedDto.sku}' already exists`);
      }
    }

    // 4. Update product
    try {
      const product = await this.repository.update(id, validatedDto);
      return product;
    } catch (error) {
      throw new DatabaseError(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
