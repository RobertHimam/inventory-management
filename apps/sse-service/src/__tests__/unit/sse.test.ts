import { SSEService } from '../../services/SSEService';
import { Response } from 'express';

const mockResponse = () => {
  const res = {
    writeHead: jest.fn(),
    write: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  } as unknown as jest.Mocked<Response>;
  return res;
};

describe('SSEService', () => {
  let sseService: SSEService;

  beforeEach(() => {
    sseService = new SSEService();
  });

  afterEach(() => {
    sseService.stopHeartbeat();
  });

  describe('Connection Management', () => {
    it('should add a connection successfully', () => {
      const res = mockResponse();
      const success = sseService.addConnection('user-1', res);
      expect(success).toBe(true);
      expect(sseService.getConnectionCount('user-1')).toBe(1);
    });

    it('should reject a connection if user exceeds 5 connections', () => {
      for (let i = 0; i < 5; i++) {
        const res = mockResponse();
        expect(sseService.addConnection('user-1', res)).toBe(true);
      }
      const res6 = mockResponse();
      expect(sseService.addConnection('user-1', res6)).toBe(false);
      expect(sseService.getConnectionCount('user-1')).toBe(5);
    });

    it('should remove a connection successfully', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);
      sseService.removeConnection('user-1', res);
      expect(sseService.getConnectionCount('user-1')).toBe(0);
    });
  });

  describe('Broadcasting & Heartbeat', () => {
    it('should format and write SSE data on broadcast', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);

      const eventData = { productId: 'prod-1', quantity: 10 };
      sseService.broadcast('stock-in', eventData);

      expect(res.write).toHaveBeenCalledWith(
        `event: stock-in\ndata: ${JSON.stringify(eventData)}\n\n`
      );
    });

    it('should send heartbeat to all connections', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);

      sseService.sendHeartbeat();
      expect(res.write).toHaveBeenCalledWith(': heartbeat\n\n');
    });
  });

  describe('Event Validation & Mapping', () => {
    it('should validate and broadcast valid stock.in.created event', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);

      const payload = { stockInId: 'tx-1', productId: 'prod-1', quantity: 10 };
      const success = sseService.handleRabbitMQEvent('stock.in.created', payload);

      expect(success).toBe(true);
      expect(res.write).toHaveBeenCalledWith(
        `event: stock-in\ndata: ${JSON.stringify(payload)}\n\n`
      );
    });

    it('should validate and broadcast valid stock.out.created event', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);

      const payload = { stockOutId: 'tx-2', productId: 'prod-1', quantity: 5 };
      const success = sseService.handleRabbitMQEvent('stock.out.created', payload);

      expect(success).toBe(true);
      expect(res.write).toHaveBeenCalledWith(
        `event: stock-out\ndata: ${JSON.stringify(payload)}\n\n`
      );
    });

    it('should validate and broadcast valid stock.low.detected event', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);

      const payload = { productId: 'prod-1', currentQuantity: 2, reorderLevel: 5, timestamp: new Date().toISOString() };
      const success = sseService.handleRabbitMQEvent('stock.low.detected', payload);

      expect(success).toBe(true);
      expect(res.write).toHaveBeenCalledWith(
        `event: low-stock\ndata: ${JSON.stringify(payload)}\n\n`
      );
    });

    it('should reject invalid events', () => {
      const res = mockResponse();
      sseService.addConnection('user-1', res);

      // Invalid stock.in.created payload (missing stockInId)
      const payload = { productId: 'prod-1', quantity: 10 };
      const success = sseService.handleRabbitMQEvent('stock.in.created', payload);

      expect(success).toBe(false);
      expect(res.write).not.toHaveBeenCalled();
    });
  });
});
