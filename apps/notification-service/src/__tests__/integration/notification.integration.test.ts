/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Application } from 'express';
import { createAccessToken } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { createApp } from '../../app';
import { NotificationService } from '../../services/NotificationService';
import { NotificationModel } from '../../models/notification.model';

const jwtSecret = 'test-secret';
let mongoServer: MongoMemoryServer;
let app: Application;
let service: NotificationService;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

const mockEmailClient = {
  send: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = jwtSecret;
  process.env.PORT = '8010';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'notification-integration-test' });

  service = new NotificationService(mockEmailClient, mockLogger);
  app = createApp(service, jwtSecret);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Notification Service Integration Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('OK');
    });
  });

  describe('GET /notifications', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app)
        .get('/notifications')
        .expect(401);
    });

    it('should return notifications for the authenticated user only', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await NotificationModel.create([
        {
          userId: 'user-123',
          type: 'STOCK_MOVEMENT',
          recipient: 'user123@example.com',
          subject: 'Stock In Confirmed',
          body: 'Confirm body',
          status: 'SENT',
        },
        {
          userId: 'user-different',
          type: 'STOCK_MOVEMENT',
          recipient: 'different@example.com',
          subject: 'Other Confirmed',
          body: 'Other body',
          status: 'SENT',
        },
      ]);

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe('user-123');
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read successfully', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      const notif = await NotificationModel.create({
        userId: 'user-123',
        type: 'STOCK_MOVEMENT',
        recipient: 'user123@example.com',
        subject: 'Stock In Confirmed',
        body: 'Confirm body',
        status: 'SENT',
        read: false,
      });

      const res = await request(app)
        .patch(`/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const updated = await NotificationModel.findById(notif._id);
      expect(updated!.read).toBe(true);
    });

    it('should forbid marking another user\'s notification as read', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      const notif = await NotificationModel.create({
        userId: 'user-different',
        type: 'STOCK_MOVEMENT',
        recipient: 'different@example.com',
        subject: 'Other Confirmed',
        body: 'Other body',
        status: 'SENT',
        read: false,
      });

      await request(app)
        .patch(`/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      const updated = await NotificationModel.findById(notif._id);
      expect(updated!.read).toBe(false);
    });
  });

  describe('GET /notifications/api/v1/notifications (gateway path)', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app)
        .get('/notifications/api/v1/notifications')
        .expect(401);
    });

    it('should return notifications for the authenticated user', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      await NotificationModel.create([
        {
          userId: 'user-123',
          type: 'WELCOME',
          recipient: 'user123@example.com',
          subject: 'Welcome',
          body: 'Welcome body',
          status: 'SENT',
        },
        {
          userId: 'user-other',
          type: 'WELCOME',
          recipient: 'other@example.com',
          subject: 'Welcome Other',
          body: 'Other body',
          status: 'SENT',
        },
      ]);

      const res = await request(app)
        .get('/notifications/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe('user-123');
    });
  });

  describe('PATCH /notifications/api/v1/notifications/:id/read (gateway path)', () => {
    it('should mark notification as read', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      const notif = await NotificationModel.create({
        userId: 'user-123',
        type: 'WELCOME',
        recipient: 'user123@example.com',
        subject: 'Welcome',
        body: 'Welcome body',
        status: 'SENT',
        read: false,
      });

      const res = await request(app)
        .patch(`/notifications/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const updated = await NotificationModel.findById(notif._id);
      expect(updated!.read).toBe(true);
    });

    it('should forbid marking another user notification as read', async () => {
      const token = createAccessToken({ sub: 'user-123', role: Role.USER }, jwtSecret);

      const notif = await NotificationModel.create({
        userId: 'user-other',
        type: 'WELCOME',
        recipient: 'other@example.com',
        subject: 'Welcome',
        body: 'Welcome body',
        status: 'SENT',
        read: false,
      });

      await request(app)
        .patch(`/notifications/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
