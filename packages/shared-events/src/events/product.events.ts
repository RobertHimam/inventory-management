import { Event } from '../event';
import { VERSION } from '../versions';
import { z } from 'zod';

export interface ProductCreatedEventPayload {
  productId: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  stockQuantity?: number;
}

export const productCreatedEventSchema = z.object({
  productId: z.string(),
  name: z.string(),
  sku: z.string(),
  categoryId: z.string(),
  price: z.number(),
  stockQuantity: z.number().optional(),
});

export function createProductCreatedEvent(
  correlationId: string,
  payload: ProductCreatedEventPayload
): Event<ProductCreatedEventPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.PRODUCT_CREATED.type,
    version: VERSION.PRODUCT_CREATED.version,
    payload,
  };
}

export interface ProductUpdatedEventPayload {
  productId: string;
  name?: string;
  sku?: string;
  categoryId?: string;
  price?: number;
  isActive?: boolean;
}

export const productUpdatedEventSchema = z.object({
  productId: z.string(),
  name: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.number().optional(),
  isActive: z.boolean().optional(),
});

export function createProductUpdatedEvent(
  correlationId: string,
  payload: ProductUpdatedEventPayload
): Event<ProductUpdatedEventPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.PRODUCT_UPDATED.type,
    version: VERSION.PRODUCT_UPDATED.version,
    payload,
  };
}

export interface ProductDeletedEventPayload {
  productId: string;
  deletedBy: string;
}

export const productDeletedEventSchema = z.object({
  productId: z.string(),
  deletedBy: z.string(),
});

export function createProductDeletedEvent(
  correlationId: string,
  payload: ProductDeletedEventPayload
): Event<ProductDeletedEventPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.PRODUCT_DELETED.type,
    version: VERSION.PRODUCT_DELETED.version,
    payload,
  };
}
