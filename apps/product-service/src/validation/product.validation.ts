import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().optional().default(0),
  sku: z.string().min(1).max(50).trim().toUpperCase(),
  category: z.string().min(1).max(100).trim(),
  stockQuantity: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  search: z.string().optional(),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListProductsQueryDto = z.infer<typeof listProductsQuerySchema>;
