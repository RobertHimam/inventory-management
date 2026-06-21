import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { createLogger } from '@inventory/shared-logger';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { AuditRepository } from './repositories/AuditRepository';
import { AuditService } from './services/AuditService';

const logger = createLogger();

async function start() {
  try {
    await mongoose.connect(config.mongodbUri, {
      dbName: config.auditDb,
    });
    logger.info('MongoDB connected in Audit Service');

    const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
    await rabbitConn.connect();
    logger.info('RabbitMQ connected in Audit Service');

    const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange, 'audit');
    const auditRepository = new AuditRepository();
    const auditService = new AuditService(auditRepository, logger);

    await eventBus.subscribe('audit.logged', async (payload: unknown, headers: Record<string, unknown>, correlationId?: string) => {
      try {
        await auditService.handleAuditEvent(payload, headers, correlationId);
      } catch (err) {
        logger.error('Failed to process audit.logged message', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
    logger.info('Subscribed to audit.logged events');

    const app = createApp();

    app.listen(config.port, () => {
      logger.info(`Audit Service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start Audit Service', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void start();
