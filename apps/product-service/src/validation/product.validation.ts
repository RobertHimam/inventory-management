import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative(),
  sku: z.string().min(1).max(50).trim().toUpperCase(),
  category: z.string().min(1).max(100).trim(),
  stockQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().optional().default(true),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
