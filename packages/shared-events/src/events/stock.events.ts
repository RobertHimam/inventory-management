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

export interface StockOutCreatedPayload {
  stockOutId: string;
  productId: string;
  quantity: number;
}

export function createStockOutCreatedEvent(
  correlationId: string,
  payload: StockOutCreatedPayload
): Event<StockOutCreatedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.STOCK_OUT_CREATED.type,
    version: VERSION.STOCK_OUT_CREATED.version,
    payload,
  };
}

export interface LowStockDetectedPayload {
  productId: string;
  currentQuantity: number;
  reorderLevel: number;
  timestamp: Date;
}

export function createLowStockDetectedEvent(
  correlationId: string,
  payload: LowStockDetectedPayload
): Event<LowStockDetectedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.LOW_STOCK_DETECTED.type,
    version: VERSION.LOW_STOCK_DETECTED.version,
    payload,
  };
}

export interface StockAdjustmentCreatedPayload {
  stockAdjustmentId: string;
  productId: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
}

export function createStockAdjustmentCreatedEvent(
  correlationId: string,
  payload: StockAdjustmentCreatedPayload
): Event<StockAdjustmentCreatedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.STOCK_ADJUSTMENT_CREATED.type,
    version: VERSION.STOCK_ADJUSTMENT_CREATED.version,
    payload,
  };
}


