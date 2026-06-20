import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';

async function start() {
  await mongoose.connect(config.mongodbUri, { dbName: config.inventoryDb });

  const app = createApp();

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Inventory Service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start inventory-service:', err);
  process.exit(1);
});
