import { Event } from '../event';
import { VERSION } from '../versions';
import { z } from 'zod';

export interface ProductCreatedPayload {
  productId: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
}

export const productCreatedSchema = z.object({
  productId: z.string(),
  name: z.string(),
  sku: z.string(),
  categoryId: z.string(),
  price: z.number(),
});

export function createProductCreatedEvent(
  correlationId: string,
  payload: ProductCreatedPayload
): Event<ProductCreatedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.PRODUCT_CREATED.type,
    version: VERSION.PRODUCT_CREATED.version,
    payload,
  };
}
