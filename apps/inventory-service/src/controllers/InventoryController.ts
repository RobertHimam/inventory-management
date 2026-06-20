import { Request, Response } from 'express';
import { InventoryService } from '../services/InventoryService';
import { ValidationError, NotFoundError } from '../errors';

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  async getItemDetail(req: Request<{ productId: string }>, res: Response): Promise<void> {
    try {
      const productId = req.params.productId;
      const item = await this.inventoryService.getItemByProductId(productId);
      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async listItems(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string>;
      const result = await this.inventoryService.listItems(query);
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
}
