import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { ValidationError, NotFoundError, ConflictError } from '../errors';

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sort, order } = req.query as Record<string, string | undefined>;
      const result = await this.service.list({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        search,
        sort,
        order: order === 'asc' ? 'asc' : 'desc',
      });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const category = await this.service.getById(req.params.id);
      res.status(200).json({ success: true, data: category });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const category = await this.service.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ success: false, error: err.message });
      } else if (err instanceof ConflictError) {
        res.status(409).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const category = await this.service.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ success: false, error: err.message });
      } else if (err instanceof ConflictError) {
        res.status(409).json({ success: false, error: err.message });
      } else if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: string } }).user;
      const deletedBy = user?.userId ?? 'unknown';
      await this.service.delete(req.params.id, deletedBy);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }
}
