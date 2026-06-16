import { z } from 'zod';

export const stockInSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').trim(),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
});

export type StockInDto = z.infer<typeof stockInSchema>;

export const stockOutSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').trim(),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
});

export type StockOutDto = z.infer<typeof stockOutSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').trim(),
  quantity: z.number().int('Quantity must be an integer'), // Can be negative or positive
  reason: z.string().min(1, 'Reason is required').trim(),
});

export type StockAdjustmentDto = z.infer<typeof stockAdjustmentSchema>;

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  search: z.string().optional(),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListInventoryQueryDto = z.infer<typeof listInventoryQuerySchema>;


