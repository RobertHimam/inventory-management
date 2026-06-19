import { Response } from 'express';
import { z } from 'zod';

const stockInSchema = z.object({
  stockInId: z.string(),
  productId: z.string(),
  quantity: z.number(),
});

const stockOutSchema = z.object({
  stockOutId: z.string(),
  productId: z.string(),
  quantity: z.number(),
});

const lowStockSchema = z.object({
  productId: z.string(),
  currentQuantity: z.number(),
  reorderLevel: z.number(),
  timestamp: z.any(),
});

const notificationSchema = z.object({
  message: z.string(),
  userId: z.string().optional(),
});

export class SSEService {
  private connections = new Map<string, Response[]>();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.startHeartbeat(15000);
  }

  addConnection(userId: string, res: Response): boolean {
    const userConns = this.connections.get(userId) || [];
    if (userConns.length >= 5) {
      return false;
    }
    userConns.push(res);
    this.connections.set(userId, userConns);
    return true;
  }

  removeConnection(userId: string, res: Response): void {
    const userConns = this.connections.get(userId) || [];
    const filtered = userConns.filter((c) => c !== res);
    if (filtered.length === 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, filtered);
    }
  }

  getConnectionCount(userId: string): number {
    return (this.connections.get(userId) || []).length;
  }

  broadcast(eventType: string, payload: unknown): void {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const [, userConns] of this.connections.entries()) {
      for (const res of userConns) {
        res.write(message);
      }
    }
  }

  sendHeartbeat(): void {
    for (const [, userConns] of this.connections.entries()) {
      for (const res of userConns) {
        res.write(': heartbeat\n\n');
      }
    }
  }

  startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  handleRabbitMQEvent(eventType: string, payload: Record<string, unknown>): boolean {
    try {
      let sseEvent = eventType;
      let validatedPayload = payload;

      if (eventType === 'stock.in.created') {
        validatedPayload = stockInSchema.parse(payload);
        sseEvent = 'stock-in';
      } else if (eventType === 'stock.out.created') {
        validatedPayload = stockOutSchema.parse(payload);
        sseEvent = 'stock-out';
      } else if (eventType === 'stock.low.detected') {
        validatedPayload = lowStockSchema.parse(payload);
        sseEvent = 'low-stock';
      } else if (eventType === 'notification' || eventType === 'notification.created') {
        validatedPayload = notificationSchema.parse(payload);
        sseEvent = 'notification';
      } else {
        return false;
      }

      this.broadcast(sseEvent, validatedPayload);
      return true;
    } catch (err) {
      return false;
    }
  }
}
