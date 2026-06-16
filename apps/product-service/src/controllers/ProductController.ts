import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { CreateProductDto, UpdateProductDto } from '../validation/product.validation';
import { ConflictError, ValidationError, NotFoundError } from '../errors';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  async createProduct(req: Request<{}, {}, CreateProductDto>, res: Response): Promise<void> {
    try {
      const productData = req.body;
      const correlationId = (req as any).correlationId;
      const user = (req as any).user;
      const product = user
        ? await this.productService.createProduct(productData, correlationId, user)
        : correlationId
          ? await this.productService.createProduct(productData, correlationId)
          : await this.productService.createProduct(productData);

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

  async updateProduct(req: Request<{ id: string }, {}, UpdateProductDto>, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const updateData = req.body;
      const correlationId = (req as any).correlationId;
      const user = (req as any).user;
      const product = user
        ? await this.productService.updateProduct(productId, updateData, correlationId, user)
        : correlationId
          ? await this.productService.updateProduct(productId, updateData, correlationId)
          : await this.productService.updateProduct(productId, updateData);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ success: false, error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async deleteProduct(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const user = (req as any).user;
      const deletedBy = user?.userId || 'unknown';
      const correlationId = (req as any).correlationId;
      const product = user
        ? await this.productService.deleteProduct(productId, deletedBy, correlationId, user)
        : correlationId
          ? await this.productService.deleteProduct(productId, deletedBy, correlationId)
          : await this.productService.deleteProduct(productId, deletedBy);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async listProducts(req: Request<{}, {}, {}, any>, res: Response): Promise<void> {
    try {
      const query = req.query;
      const result = await this.productService.listProducts(query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async getProductDetail(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const product = await this.productService.getProductDetail(productId);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }
}
