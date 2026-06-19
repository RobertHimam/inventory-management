/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { Application } from 'express';
import { createServer, Server } from 'http';
import http from 'http';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { SSEService } from '../../services/SSEService';
import { createApp } from '../../app';

describe('SSE Service Integration Tests', () => {
  const jwtSecret = 'test-secret';
  let app: Application;
  let sseService: SSEService;
  let server: Server;

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
    process.env.NODE_ENV = 'test';
    process.env.PORT = '8008';
    process.env.RABBITMQ_URL = 'amqp://localhost';
    process.env.RABBITMQ_EXCHANGE = 'test-exchange';
  });

  beforeEach((done) => {
    sseService = new SSEService();
    // Stop the default fast heartbeat for testing
    sseService.stopHeartbeat();
    app = createApp(sseService, jwtSecret);
    server = createServer(app);
    server.listen(0, () => {
      done();
    });
  });

  afterEach((done) => {
    sseService.stopHeartbeat();
    if (server) {
      server.closeAllConnections();
      server.close(done);
    } else {
      done();
    }
  });

  describe('GET /events - Authentication', () => {
    it('should return 401 when no token is provided', (done) => {
      const addr = server.address() as any;
      const req = http.request({
        host: '127.0.0.1',
        port: addr.port,
        path: '/events',
        method: 'GET',
      }, (res) => {
        expect(res.statusCode).toBe(401);
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          const json = JSON.parse(body);
          expect(json.success).toBe(false);
          expect(json.error).toContain('token');
          done();
        });
      });
      req.end();
    });

    it('should return 401 when an invalid token is provided', (done) => {
      const addr = server.address() as any;
      const req = http.request({
        host: '127.0.0.1',
        port: addr.port,
        path: '/events?token=invalid-token',
        method: 'GET',
      }, (res) => {
        expect(res.statusCode).toBe(401);
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          const json = JSON.parse(body);
          expect(json.success).toBe(false);
          done();
        });
      });
      req.end();
    });

    it('should allow connection with valid token in Authorization header', (done) => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER, username: 'testuser' }, jwtSecret);
      const addr = server.address() as any;

      const req = http.request({
        host: '127.0.0.1',
        port: addr.port,
        path: '/events',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        expect(res.headers['cache-control']).toBe('no-cache');
        expect(res.headers['connection']).toBe('keep-alive');
        req.destroy();
        done();
      });

      req.end();
    });

    it('should allow connection with valid token in query parameters', (done) => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER, username: 'testuser' }, jwtSecret);
      const addr = server.address() as any;

      const req = http.request({
        host: '127.0.0.1',
        port: addr.port,
        path: `/events?token=${token}`,
        method: 'GET',
      }, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        expect(res.headers['cache-control']).toBe('no-cache');
        expect(res.headers['connection']).toBe('keep-alive');
        req.destroy();
        done();
      });

      req.end();
    });
  });

  describe('GET /events - Connection Tracking & Limits', () => {
    it('should enforce maximum of 5 connections per user', async () => {
      const token = createAccessToken({ sub: 'user-limit', role: Role.USER }, jwtSecret);
      const activeRequests: http.ClientRequest[] = [];
      const addr = server.address() as any;

      // Open 5 successful connections
      for (let i = 0; i < 5; i++) {
        const req = http.request({
          host: '127.0.0.1',
          port: addr.port,
          path: `/events?token=${token}`,
          method: 'GET',
        });

        await new Promise<void>((resolve, reject) => {
          req.on('response', (res) => {
            expect(res.statusCode).toBe(200);
            resolve();
          });
          req.on('error', reject);
          req.end();
        });
        activeRequests.push(req);
      }

      expect(sseService.getConnectionCount('user-limit')).toBe(5);

      // 6th connection should fail with 429
      const response = await new Promise<any>((resolve) => {
        const req = http.request({
          host: '127.0.0.1',
          port: addr.port,
          path: `/events?token=${token}`,
          method: 'GET',
        }, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          });
        });
        req.end();
      });

      expect(response.statusCode).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('limit');

      // Cleanup
      for (const req of activeRequests) {
        req.destroy();
      }
    });
  });
});
