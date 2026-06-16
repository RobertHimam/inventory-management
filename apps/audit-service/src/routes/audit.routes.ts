import { Router } from 'express';
import { AuditController } from '../controllers/AuditController';
import { AuditService } from '../services/AuditService';
import { AuditRepository } from '../repositories/AuditRepository';
import { authenticate, authorize } from '@inventory/shared-auth';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { config } from '../config';
import { createLogger } from '@inventory/shared-logger';

const router: Router = Router();
const logger = createLogger();

const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
rabbitConn.connect().then(() => {
  logger.info('Connected to RabbitMQ in Audit Service');
}).catch((err) => {
  logger.error('Failed to connect to RabbitMQ:', { error: err instanceof Error ? err.message : String(err) });
});
const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange);

const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository, logger);
const auditController = new AuditController(auditService);

eventBus.subscribe('audit.logged', async (payload: any, headers: Record<string, unknown>, correlationId?: string) => {
  try {
    await auditService.handleAuditEvent(payload, headers, correlationId);
  } catch (err) {
    logger.error('Failed to process message in subscriber', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}).catch((err) => {
  logger.error('Failed to subscribe to audit.logged events:', { error: err instanceof Error ? err.message : String(err) });
});

const auth = authenticate(config.jwtSecret);
const canRead = authorize(['audit:read']);

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Search and filter audit logs
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/', auth, canRead, auditController.listAuditLogs.bind(auditController));

export default router;
export { auditService };
