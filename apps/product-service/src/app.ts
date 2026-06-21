import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import supplierRoutes from './routes/supplier.routes';
import healthRoutes from './routes/health.routes';
import { swaggerDefinition } from './swagger/docs';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cookieParser());
  app.use(express.json());
  app.use(correlationMiddleware);

  // Swagger setup
  const swaggerSpec = swaggerJsdoc({
    definition: swaggerDefinition,
    apis: ['./src/swagger/docs.ts', './src/routes/*.ts'],
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Routes
  app.use('/products', productRoutes);
  app.use('/categories', categoryRoutes);
  app.use('/suppliers', supplierRoutes);
  app.use('/', healthRoutes);

  // Error handling
  app.use(errorMiddleware);

  // 404 handler
  app.use('*', (_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  return app;
};
