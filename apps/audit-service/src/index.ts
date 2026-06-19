import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { createLogger } from '@inventory/shared-logger';

const logger = createLogger();

async function start() {
  try {
    await mongoose.connect(config.mongodbUri, {
      dbName: config.auditDb,
    });
    logger.info('MongoDB connected in Audit Service');

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
