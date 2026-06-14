import '../models/user.model';
import '../models/refreshToken.model';
import mongoose from 'mongoose';
import app from './app';
import { config } from './config';
import { Logger } from '@inventory/shared-logger';

const logger = new Logger({ service: 'auth-service' });

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
    logger.error('Failed to start service', err as Error);
    process.exit(1);
  }
}

start();
