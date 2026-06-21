import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import createAuthRouter from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { setupSwagger } from './swagger/docs';
import { EventBus } from '@inventory/shared-rabbitmq';

export function createApp(eventBus: EventBus): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(correlationMiddleware);

  // Routes
  app.use('/auth', createAuthRouter(eventBus));
  app.use('/users', userRoutes);
  app.use(healthRoutes);

  // Swagger documentation
  setupSwagger(app);

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
