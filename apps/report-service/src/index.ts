import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { ReportService } from './services/ReportService';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { createLogger } from '@inventory/shared-logger';

const logger = createLogger();

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri, {
      dbName: config.reportDb,
    });
    logger.info('MongoDB connected in Report Service');

    const reportService = new ReportService(logger);
    const app = createApp(reportService, config.jwtSecret);

    // Connect to RabbitMQ then subscribe — order matters: channel must exist before subscribe
    const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
    const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange, 'report');

    const eventSubscriptions = [
      { event: 'product.created', handler: reportService.handleProductCreated.bind(reportService) },
      { event: 'product.updated', handler: reportService.handleProductUpdated.bind(reportService) },
      { event: 'product.deleted', handler: reportService.handleProductDeleted.bind(reportService) },
      { event: 'stock.in.created', handler: reportService.handleStockIn.bind(reportService) },
      { event: 'stock.out.created', handler: reportService.handleStockOut.bind(reportService) },
      { event: 'stock.adjustment.created', handler: reportService.handleStockAdjustment.bind(reportService) },
      { event: 'stock.low.detected', handler: reportService.handleStockLowDetected.bind(reportService) },
    ];

    await rabbitConn.connect();
    logger.info('Connected to RabbitMQ in Report Service');

    for (const sub of eventSubscriptions) {
      await eventBus.subscribe(sub.event, async (payload: unknown) => {
        try {
          await sub.handler(payload);
        } catch (err) {
          logger.error(`Failed to handle event ${sub.event}:`, {
            error: err instanceof Error ? err.message : String(err),
            payload,
          });
          throw err;
        }
      });
    }
    logger.info('Subscribed to all report events');

    app.listen(config.port, () => {
      logger.info(`Report Service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start Report Service', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void start();
