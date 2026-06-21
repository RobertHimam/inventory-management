import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { createLogger } from '@inventory/shared-logger';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';

const logger = createLogger({ level: 'info' });

async function start() {
  try {
    await mongoose.connect(config.mongodbUri, {
      dbName: config.authDb,
    });
    logger.info('MongoDB connected');

    const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
    await rabbitConn.connect();
    const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange, 'auth');

    const app = createApp(eventBus);
    app.listen(config.port, () => {
      logger.info(`Auth service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start service', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

void start();
