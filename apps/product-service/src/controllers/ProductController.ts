import { Request, Response } from 'express';
import { Role } from '@inventory/shared-types';
import { ProductService } from '../services/ProductService';
import { CreateProductDto, UpdateProductDto } from '../validation/product.validation';
import { ConflictError, ValidationError, NotFoundError } from '../errors';

interface ExtendedRequest<P = Record<string, string>, B = unknown, Q = Record<string, string | undefined>> extends Request<P, unknown, B, Q> {
  user?: { userId: string; username?: string; role: Role };
  correlationId?: string;
}

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  async createProduct(req: ExtendedRequest<Record<string, never>, CreateProductDto>, res: Response): Promise<void> {
    try {
      const product = await this.productService.createProduct(req.body, req.correlationId, req.user);

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

  async updateProduct(req: ExtendedRequest<{ id: string }, UpdateProductDto>, res: Response): Promise<void> {
    try {
      const product = await this.productService.updateProduct(req.params.id, req.body, req.correlationId, req.user);

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

  async deleteProduct(req: ExtendedRequest<{ id: string }>, res: Response): Promise<void> {
    try {
      const deletedBy = req.user?.userId ?? 'unknown';
      const product = await this.productService.deleteProduct(req.params.id, deletedBy, req.correlationId, req.user);

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

  async listProducts(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      const result = await this.productService.listProducts(req.query);

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
