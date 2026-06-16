import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authenticate } from '@inventory/shared-auth';
import { Role } from '@inventory/shared-types';
import { ReportService } from './services/ReportService';

export function createApp(reportService: ReportService, jwtSecret: string): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Swagger docs definition
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Report Service API',
      version: '0.1.0',
      description: 'API documentation for the Report Service',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Development Server',
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
    apis: [], // Can add inline doc annotations if necessary
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
  
  // GET /reports/dashboard (USER and above)
  app.get('/api/v1/reports/dashboard', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
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

  // GET /reports/sales (ADMIN only)
  app.get('/api/v1/reports/sales', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
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

  // GET /reports/inventory-valuation (ADMIN only)
  app.get('/api/v1/reports/inventory-valuation', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
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

  // GET /reports/low-stock (USER and above)
  app.get('/api/v1/reports/low-stock', auth, async (_req: Request, res: Response, next: NextFunction) => {
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
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Report Service Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return app;
}
