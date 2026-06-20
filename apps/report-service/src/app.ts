import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authenticate } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { ReportService } from './services/ReportService';

export function createApp(reportService: ReportService, jwtSecret: string): Application {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Swagger docs definition
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Report Service API',
      version: '0.1.0',
      description: 'API documentation for the Report Service',
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
        name: 'Reports',
        description: 'Reporting operations',
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

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'report-service' });
  });

  // Authenticaton middlewares
  const auth = authenticate(jwtSecret);

  // Zod schemas for query validation
  const salesQuerySchema = z.object({
    startDate: z.string().datetime({ message: 'Invalid ISO date format' }).optional(),
    endDate: z.string().datetime({ message: 'Invalid ISO date format' }).optional(),
  });

  // Endpoints

  /**
   * @swagger
   * /reports/dashboard:
   *   get:
   *     tags:
   *       - Reports
   *     summary: Get dashboard metrics
   *     description: Retrieves dashboard metrics for authenticated users. Results are cached by role.
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   description: Dashboard metrics data
   *                 source:
   *                   type: string
   *                   enum: [cache, db]
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       500:
   *         description: Server error
   */
  app.get('/reports/dashboard', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as import('express').Request & { user?: { role: string } }).user;
      const cacheKey = `dashboard:${user?.role || 'USER'}`;
      
      const cached = await reportService.getCachedReport(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, data: cached, source: 'cache' });
        return;
      }

      const metrics = await reportService.getDashboardMetrics();
      await reportService.setCachedReport(cacheKey, metrics);
      
      res.status(200).json({ success: true, data: metrics, source: 'db' });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /reports/sales:
   *   get:
   *     tags:
   *       - Reports
   *     summary: Get sales report
   *     description: Retrieves sales report for a date range. ADMIN only. Results are cached.
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date in ISO 8601 format (optional)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date in ISO 8601 format (optional)
   *     responses:
   *       200:
   *         description: Sales report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   description: Sales report data
   *                 source:
   *                   type: string
   *                   enum: [cache, db]
   *       400:
   *         description: Validation error in query parameters
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       403:
   *         description: Forbidden - requires ADMIN role
   *       500:
   *         description: Server error
   */
  app.get('/reports/sales', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as import('express').Request & { user?: { role: string } }).user;
      if (user?.role !== Role.ADMIN) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      // Query Validation
      const validation = salesQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: validation.error.errors,
        });
        return;
      }

      const { startDate, endDate } = validation.data;
      const cacheKey = `sales:${startDate || 'none'}:${endDate || 'none'}`;

      const cached = await reportService.getCachedReport(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, data: cached, source: 'cache' });
        return;
      }

      const report = await reportService.getSalesReport(startDate, endDate);
      await reportService.setCachedReport(cacheKey, report);

      res.status(200).json({ success: true, data: report, source: 'db' });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /reports/inventory-valuation:
   *   get:
   *     tags:
   *       - Reports
   *     summary: Get inventory valuation report
   *     description: Retrieves inventory valuation report. ADMIN only. Results are cached.
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Inventory valuation report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   description: Inventory valuation data
   *                 source:
   *                   type: string
   *                   enum: [cache, db]
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       403:
   *         description: Forbidden - requires ADMIN role
   *       500:
   *         description: Server error
   */
  app.get('/reports/inventory-valuation', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as import('express').Request & { user?: { role: string } }).user;
      if (user?.role !== Role.ADMIN) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      const cacheKey = 'inventory-valuation';
      const cached = await reportService.getCachedReport(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, data: cached, source: 'cache' });
        return;
      }

      const valuation = await reportService.getInventoryValuation();
      await reportService.setCachedReport(cacheKey, valuation);

      res.status(200).json({ success: true, data: valuation, source: 'db' });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /reports/low-stock:
   *   get:
   *     tags:
   *       - Reports
   *     summary: Get low stock items report
   *     description: Retrieves a report of items with low stock levels. Results are cached.
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Low stock report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   description: Array of low stock items
   *                 source:
   *                   type: string
   *                   enum: [cache, db]
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       500:
   *         description: Server error
   */
  app.get('/reports/low-stock', auth, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cacheKey = 'low-stock';
      const cached = await reportService.getCachedReport(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, data: cached, source: 'cache' });
        return;
      }

      const report = await reportService.getLowStockReport();
      await reportService.setCachedReport(cacheKey, report);

      res.status(200).json({ success: true, data: report, source: 'db' });
    } catch (err) {
      next(err);
    }
  });

  // Error middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Report Service Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return app;
}
