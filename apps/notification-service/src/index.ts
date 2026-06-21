import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { NotificationService } from './services/NotificationService';
import { TemplateModel } from './models/template.model';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { createLogger } from '@inventory/shared-logger';

const logger = createLogger();

// Console-backed Email Client for development/production log visibility
const emailClient = {
  async send(to: string, subject: string, body: string) {
    logger.info(`[Email Sent Mock]`, {
      to,
      subject,
      body,
    });
    return { messageId: `msg-${Date.now()}` };
  },
};

async function seedTemplates() {
  const welcomeExists = await TemplateModel.findOne({ key: 'welcome' });
  if (!welcomeExists) {
    await TemplateModel.create({
      key: 'welcome',
      subject: 'Welcome to Antigravity!',
      body: 'Hello {{username}}, welcome to our platform.',
    });
  }

  const lowStockExists = await TemplateModel.findOne({ key: 'low-stock' });
  if (!lowStockExists) {
    await TemplateModel.create({
      key: 'low-stock',
      subject: 'LOW STOCK ALERT: {{productId}}',
      body: 'Product {{productId}} has reached a low stock of {{currentQuantity}}.',
    });
  }

  const stockConfirmExists = await TemplateModel.findOne({ key: 'stock-confirm' });
  if (!stockConfirmExists) {
    await TemplateModel.create({
      key: 'stock-confirm',
      subject: 'Stock Transaction Confirmation',
      body: 'Dear User, your stock transaction of {{quantity}} items for product {{productId}} has been recorded.',
    });
  }

  logger.info('Notification templates seeded successfully');
}

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri, {
      dbName: config.auditDb, // shares audit DB, different collections
    });
    logger.info('MongoDB connected in Notification Service');

    // Seed default templates
    await seedTemplates();

    const notifService = new NotificationService(emailClient, logger);
    const app = createApp(notifService, config.jwtSecret);

    // Connect to RabbitMQ then subscribe — channel must exist before subscribe
    const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
    const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange, 'notification');

    const subscriptions = [
      { event: 'stock.low.detected', handler: notifService.handleStockLowDetected.bind(notifService) },
      { event: 'stock.in.created', handler: notifService.handleStockIn.bind(notifService) },
      { event: 'stock.out.created', handler: notifService.handleStockOut.bind(notifService) },
      { event: 'user.created', handler: notifService.handleUserCreated.bind(notifService) },
    ];

    await rabbitConn.connect();
    logger.info('Connected to RabbitMQ in Notification Service');

    for (const sub of subscriptions) {
      await eventBus.subscribe(sub.event, async (payload: unknown) => {
        try {
          await sub.handler(payload);
        } catch (err) {
          logger.error(`Failed to execute subscriber handler for ${sub.event}:`, {
            error: err instanceof Error ? err.message : String(err),
            payload,
          });
          throw err;
        }
      });
    }
    logger.info('Subscribed to all notification events');

    app.listen(config.port, () => {
      logger.info(`Notification Service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start Notification Service', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void start();
