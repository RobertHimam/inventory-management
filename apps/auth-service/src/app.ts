import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { config } from './config';
import { setupSwagger } from './swagger/docs';
import { Logger } from '@inventory/shared-logger';

const app = express();
const logger = new Logger({ service: 'auth-service' });

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(correlationMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use(healthRoutes);

// Swagger documentation
setupSwagger(app);

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
