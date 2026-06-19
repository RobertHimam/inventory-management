import { createApp } from './app';
import { config } from './config';
import { createLogger } from '@inventory/shared-logger';

const logger = createLogger();

async function start() {
  try {
    const app = createApp(config.jwtSecret);

    app.listen(config.port, () => {
      logger.info(`API Gateway listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start API Gateway:', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void start();
