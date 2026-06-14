import { Event } from '../event';
import { VERSION } from '../versions';
import { z } from 'zod';

export interface StockInCreatedPayload {
  stockInId: string;
  productId: string;
  quantity: number;
}

export const stockInCreatedSchema = z.object({
  stockInId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
});

export function createStockInCreatedEvent(
  correlationId: string,
  payload: StockInCreatedPayload
): Event<StockInCreatedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.STOCK_IN_CREATED.type,
    version: VERSION.STOCK_IN_CREATED.version,
    payload,
  };
}
