import mongoose from 'mongoose';
import app from './app';
import { config } from './config';
import { createLogger } from '@inventory/shared-logger';

const logger = createLogger({ level: 'info' });

async function start() {
  try {
    await mongoose.connect(config.mongodbUri, {
      dbName: config.authDb,
    });
    logger.info('MongoDB connected');
    app.listen(config.port, () => {
      logger.info(`Auth service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start service', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

void start();
