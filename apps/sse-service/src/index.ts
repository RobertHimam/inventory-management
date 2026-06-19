import { createApp } from './app';
import { config } from './config';
import { SSEService } from './services/SSEService';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { createLogger } from '@inventory/shared-logger';

const logger = createLogger();

async function start() {
  try {
    const sseService = new SSEService();

    // Start heartbeat
    sseService.startHeartbeat(15000);
    logger.info('Heartbeat started in SSE Service');

    // Create Express app
    const app = createApp(sseService, config.jwtSecret);

    // RabbitMQ Connection & Setup
    const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
    rabbitConn.connect()
      .then(() => {
        logger.info('Connected to RabbitMQ in SSE Service');
      })
      .catch((err) => {
        logger.error('Failed to connect to RabbitMQ:', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

    const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange);

    // Subscriptions to supported events
    const eventsToSubscribe = [
      'stock.in.created',
      'stock.out.created',
      'stock.low.detected',
      'notification',
      'notification.created',
    ];

    for (const event of eventsToSubscribe) {
      eventBus.subscribe(event, async (payload: unknown) => {
        logger.info(`Received RabbitMQ event: ${event}`, { payload });
        const handled = sseService.handleRabbitMQEvent(event, payload as Record<string, unknown>);
        if (!handled) {
          logger.warn(`Failed to process or validate event: ${event}`);
        }
      }).catch((err) => {
        logger.error(`Failed to subscribe to event: ${event}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    app.listen(config.port, () => {
      logger.info(`SSE Service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start SSE Service', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void start();
