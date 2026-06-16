import { Router } from 'express';
import { StockInController } from '../controllers/StockInController';
import { StockInService } from '../services/StockInService';
import { StockOutController } from '../controllers/StockOutController';
import { StockOutService } from '../services/StockOutService';
import { StockAdjustmentController } from '../controllers/StockAdjustmentController';
import { StockAdjustmentService } from '../services/StockAdjustmentService';
import { InventoryController } from '../controllers/InventoryController';
import { InventoryService } from '../services/InventoryService';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { authenticate, authorize } from '@inventory/shared-auth';
import { EventBus, RabbitMQConnection } from '@inventory/shared-rabbitmq';
import { config } from '../config';
import { idempotency } from '../middleware/idempotency.middleware';

const router: Router = Router();

// Initialize RabbitMQ connection and EventBus
const rabbitConn = new RabbitMQConnection(config.rabbitmqUrl);
rabbitConn.connect().catch((err) => {
  console.error('Failed to connect to RabbitMQ:', err);
});
const eventBus = new EventBus(rabbitConn, config.rabbitmqExchange);

const inventoryRepository = new InventoryRepository();
const stockInService = new StockInService(inventoryRepository, eventBus);
const stockInController = new StockInController(stockInService);

const stockOutService = new StockOutService(inventoryRepository, eventBus);
const stockOutController = new StockOutController(stockOutService);

const stockAdjustmentService = new StockAdjustmentService(inventoryRepository, eventBus);
const stockAdjustmentController = new StockAdjustmentController(stockAdjustmentService);

const inventoryService = new InventoryService(inventoryRepository);
const inventoryController = new InventoryController(inventoryService);

// Setup Auth middlewares
const auth = authenticate(config.jwtSecret);
// Ensure only ADMIN can perform Stock In/Out (USER only has inventory:read/stock:in/out in permissions but AGENTS.md forbids Stock In for USER)
// By checking 'inventory:write', we restrict it to ADMIN (since ADMIN has '*' and USER does not have 'inventory:write')
const canWrite = authorize(['inventory:write']);
const canRead = authorize(['inventory:read']);

/**
 * @swagger
 * /inventory/stock-in:
 *   post:
 *     summary: Record a stock in transaction
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique key to ensure idempotency of the stock in request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Stock in recorded successfully
 *       400:
 *         description: Validation error or missing/empty Idempotency-Key
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate request or identical request in progress
 *       500:
 *         description: Internal server error
 */
router.post('/stock-in', auth, canWrite, idempotency, stockInController.stockIn.bind(stockInController));

/**
 * @swagger
 * /inventory/stock-out:
 *   post:
 *     summary: Record a stock out transaction
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique key to ensure idempotency of the stock out request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Stock out recorded successfully
 *       400:
 *         description: Validation error or missing/empty Idempotency-Key
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate request or identical request in progress
 *       500:
 *         description: Internal server error
 */
router.post('/stock-out', auth, canWrite, idempotency, stockOutController.stockOut.bind(stockOutController));

/**
 * @swagger
 * /inventory/adjust:
 *   post:
 *     summary: Adjust stock level manually
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique key to ensure idempotency of the stock adjustment request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - reason
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 description: Quantity to adjust (can be positive or negative)
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stock adjusted successfully
 *       400:
 *         description: Validation error or missing/empty Idempotency-Key
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate request or identical request in progress
 *       500:
 *         description: Internal server error
 */
router.post('/adjust', auth, canWrite, idempotency, stockAdjustmentController.adjustStock.bind(stockAdjustmentController));

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: List all current stock balances
 *     tags: [Inventory]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by productId, sku, or productName
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
 *         description: List retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/', auth, canRead, inventoryController.listItems.bind(inventoryController));

/**
 * @swagger
 * /inventory/{productId}:
 *   get:
 *     summary: Get stock balance details for a specific product
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
router.get('/:productId', auth, canRead, inventoryController.getItemDetail.bind(inventoryController));

export default router;
