/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NotificationService } from '../../services/NotificationService';
import { NotificationModel } from '../../models/notification.model';
import { TemplateModel } from '../../models/template.model';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

let mongoServer: MongoMemoryServer;
let service: NotificationService;
let emailSendCount = 0;
let shouldFailEmail = false;

// Mock Email Client / Sender
const mockEmailClient = {
  send: jest.fn(async (_to: string, _subject: string, _body: string) => {
    emailSendCount++;
    if (shouldFailEmail) {
      throw new Error('SMTP connection timed out');
    }
    return { messageId: 'msg-123' };
  }),
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'notification-unit-test' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  emailSendCount = 0;
  shouldFailEmail = false;

  mockEmailClient.send.mockImplementation(async (_to: string, _subject: string, _body: string) => {
    emailSendCount++;
    if (shouldFailEmail) {
      throw new Error('SMTP connection timed out');
    }
    return { messageId: 'msg-123' };
  });
  
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Create default templates
  await TemplateModel.create([
    {
      key: 'welcome',
      subject: 'Welcome to Antigravity!',
      body: 'Hello {{username}}, welcome to our platform.',
    },
    {
      key: 'low-stock',
      subject: 'LOW STOCK ALERT: {{productId}}',
      body: 'Product {{productId}} has reached a low stock of {{currentQuantity}}.',
    },
    {
      key: 'stock-confirm',
      subject: 'Stock Transaction Confirmation',
      body: 'Dear User, your stock transaction of {{quantity}} items for product {{productId}} has been recorded.',
    },
  ]);

  service = new NotificationService(mockEmailClient, mockLogger);
  // Set retry backoff to 0 ms for tests to run instantly
  service.retryBackoffMs = 0;
});

describe('NotificationService Unit Tests', () => {
  describe('Welcome Email (user.created)', () => {
    it('should send welcome email successfully', async () => {
      const payload = {
        userId: 'u-1',
        username: 'john_doe',
        email: 'john@example.com',
      };

      await service.handleUserCreated(payload);

      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'john@example.com',
        'Welcome to Antigravity!',
        'Hello john_doe, welcome to our platform.'
      );

      const notif = await NotificationModel.findOne({ userId: 'u-1' });
      expect(notif).toBeDefined();
      expect(notif!.status).toBe('SENT');
      expect(notif!.read).toBe(false);
    });
  });

  describe('Low Stock Alert (stock.low.detected)', () => {
    it('should send low stock alert to admin', async () => {
      const payload = {
        productId: 'prod-99',
        currentQuantity: 3,
        reorderLevel: 5,
        timestamp: new Date(),
      };

      await service.handleStockLowDetected(payload);

      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'admin@example.com', // default admin recipient
        'LOW STOCK ALERT: prod-99',
        'Product prod-99 has reached a low stock of 3.'
      );

      const notif = await NotificationModel.findOne({ type: 'LOW_STOCK' });
      expect(notif).toBeDefined();
      expect(notif!.status).toBe('SENT');
    });
  });

  describe('Stock Movement Confirmations', () => {
    it('should handle stock in confirmation', async () => {
      const payload = {
        productId: 'prod-in',
        quantity: 5,
        userId: 'user-77',
        userEmail: 'user77@example.com',
        createdAt: new Date(),
      };

      await service.handleStockIn(payload);

      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'user77@example.com',
        'Stock Transaction Confirmation',
        'Dear User, your stock transaction of 5 items for product prod-in has been recorded.'
      );

      const notif = await NotificationModel.findOne({ userId: 'user-77' });
      expect(notif!.status).toBe('SENT');
    });
  });

  describe('Retry & DLQ Logic', () => {
    it('should retry 3 times with backoff on failure and then throw', async () => {
      shouldFailEmail = true;

      const payload = {
        userId: 'u-fail',
        username: 'broken_user',
        email: 'broke@example.com',
      };

      await expect(service.handleUserCreated(payload)).rejects.toThrow('SMTP connection timed out');

      expect(emailSendCount).toBe(3); // 3 attempts

      const notif = await NotificationModel.findOne({ userId: 'u-fail' });
      expect(notif).toBeDefined();
      expect(notif!.status).toBe('FAILED');
      expect(notif!.attempts).toBe(3);
      expect(notif!.error).toContain('SMTP connection');
    });
  });

  describe('Query & Status Updates', () => {
    it('should fetch user notifications and mark them as read', async () => {
      const n1 = await NotificationModel.create({
        userId: 'user-10',
        type: 'SYSTEM',
        recipient: 'user10@example.com',
        subject: 'System Maintenance',
        body: 'Down tonight.',
        status: 'SENT',
        read: false,
      });

      const notifications = await service.getNotificationsForUser('user-10');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].subject).toBe('System Maintenance');

      await service.markAsRead(n1._id.toString(), 'user-10');

      const updated = await NotificationModel.findById(n1._id);
      expect(updated!.read).toBe(true);
    });

    it('should prevent marking other users notifications as read', async () => {
      const n1 = await NotificationModel.create({
        userId: 'user-10',
        type: 'SYSTEM',
        recipient: 'user10@example.com',
        subject: 'System Maintenance',
        body: 'Down tonight.',
        status: 'SENT',
        read: false,
      });

      await expect(service.markAsRead(n1._id.toString(), 'other-user')).rejects.toThrow();

      const notUpdated = await NotificationModel.findById(n1._id);
      expect(notUpdated!.read).toBe(false);
    });
  });
});
