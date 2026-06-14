import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { CreateProductDto } from '../validation/product.validation';
import { ConflictError, ValidationError } from '../errors';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  async createProduct(req: Request<{}, {}, CreateProductDto>, res: Response): Promise<void> {
    try {
      const productData = req.body;
      const product = await this.productService.createProduct(productData);

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        res.status(error instanceof ConflictError ? 409 : 400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  }
}
