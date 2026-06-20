import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authenticate } from '@inventory/shared-auth';
import { NotificationService } from './services/NotificationService';

export function createApp(notificationService: NotificationService, jwtSecret: string): Application {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Swagger setup
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '0.1.0',
      description: 'API documentation for the Notification Service',
      contact: {
        name: 'API Support',
        email: 'support@inventory-management.local',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Gateway',
      },
    ],
    tags: [
      {
        name: 'Notifications',
        description: 'User notification operations',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  const swaggerSpec = swaggerJsdoc({
    definition: swaggerDefinition,
    apis: [__filename],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health route
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'notification-service' });
  });

  const auth = authenticate(jwtSecret);

  /**
   * @swagger
   * /notifications:
   *   get:
   *     tags:
   *       - Notifications
   *     summary: Get user notifications
   *     description: Retrieves all notifications for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Notifications retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Notification object
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       500:
   *         description: Server error
   */
  app.get('/notifications', auth, async (req: Request, res: Response, next: NextFunction) => {
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

  /**
   * @swagger
   * /notifications/{id}/read:
   *   patch:
   *     tags:
   *       - Notifications
   *     summary: Mark notification as read
   *     description: Marks a specific notification as read for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notification marked as read successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   description: Updated notification object
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       403:
   *         description: Forbidden - user cannot mark this notification as read
   *       404:
   *         description: Notification not found
   *       500:
   *         description: Server error
   */
  app.patch('/notifications/:id/read', auth, async (req: Request, res: Response, next: NextFunction) => {
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
