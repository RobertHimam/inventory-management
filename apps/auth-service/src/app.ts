import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { setupSwagger } from './swagger/docs';

const app: Express = express();

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
