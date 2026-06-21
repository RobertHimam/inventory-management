import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';

async function start() {
  await mongoose.connect(config.mongodbUri, { dbName: config.productDb });

  const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
  await rabbitConn.connect();
  const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange, 'product');

  const app = createApp(eventBus);

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
