import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { InventoryRepository } from './repositories/InventoryRepository';
import { ProductCreatedEventPayload, ProductUpdatedEventPayload } from '@inventory/shared-events';

async function start() {
  await mongoose.connect(config.mongodbUri, { dbName: config.inventoryDb });

  const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
  await rabbitConn.connect();
  const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange, 'inventory');

  const inventoryRepository = new InventoryRepository();

  try {
    await eventBus.subscribe('product.created', async (payload) => {
      const { productId, name, sku, stockQuantity } = payload as ProductCreatedEventPayload;
      if (productId && name && sku) {
        await inventoryRepository.syncProductInfo(productId, name, sku, stockQuantity ?? 0);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to subscribe to product.created event:', err);
  }

  try {
    await eventBus.subscribe('product.updated', async (payload) => {
      const { productId, name, sku } = payload as ProductUpdatedEventPayload;
      if (productId && (name || sku)) {
        const current = await inventoryRepository.findItemByProductId(productId);
        const resolvedName = name ?? current?.productName ?? '';
        const resolvedSku = sku ?? current?.sku ?? '';
        if (resolvedName && resolvedSku) {
          await inventoryRepository.syncProductInfo(productId, resolvedName, resolvedSku);
        }
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to subscribe to product.updated event:', err);
  }

  const app = createApp(eventBus);

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
