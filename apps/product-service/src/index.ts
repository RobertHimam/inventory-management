import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';

async function start() {
  await mongoose.connect(config.mongodbUri, { dbName: config.productDb });

  const app = createApp();

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Product Service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start product-service:', err);
  process.exit(1);
});
