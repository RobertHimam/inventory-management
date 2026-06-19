import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authenticate } from '@inventory/shared-auth';
import { NotificationService } from './services/NotificationService';

export function createApp(notificationService: NotificationService, jwtSecret: string): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Swagger setup
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '0.1.0',
      description: 'API documentation for the Notification Service',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Development Server',
      },
    ],
  };

  const swaggerSpec = swaggerJsdoc({
    definition: swaggerDefinition,
    apis: [],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health route
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'notification-service' });
  });

  const auth = authenticate(jwtSecret);

  // GET /notifications
  app.get('/api/v1/notifications', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: { userId: string } }).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      
      const list = await notificationService.getNotificationsForUser(user.userId);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /notifications/:id/read
  app.patch('/api/v1/notifications/:id/read', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: { userId: string } }).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const updated = await notificationService.markAsRead(id, user.userId);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Notification not found') {
        res.status(404).json({ success: false, error: msg });
      } else if (msg === 'Forbidden') {
        res.status(403).json({ success: false, error: 'Forbidden to mark this notification as read' });
      } else {
        next(err);
      }
    }
  });

  // Error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Notification Service Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return app;
}
