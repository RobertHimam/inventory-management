import { Router } from 'express';
import { SupplierController } from '../controllers/SupplierController';
import { SupplierService } from '../services/SupplierService';
import { SupplierRepository } from '../repositories/SupplierRepository';
import { authenticate, authorize } from '@inventory/shared-auth';
import { config } from '../config';

const router: Router = Router();

const supplierRepository = new SupplierRepository();
const supplierService = new SupplierService(supplierRepository);
const supplierController = new SupplierController(supplierService);

const auth = authenticate(config.jwtSecret);
const canRead = authorize(['product:read']);
const canWrite = authorize(['product:write']);

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: List all suppliers
 *     tags: [Suppliers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: List of suppliers
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, canRead, supplierController.list.bind(supplierController));

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Supplier detail
 *       404:
 *         description: Not found
 */
router.get('/:id', auth, canRead, supplierController.getById.bind(supplierController));

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Create a supplier
 *     tags: [Suppliers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contactEmail: { type: string, format: email }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       201:
 *         description: Supplier created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate name
 */
router.post('/', auth, canWrite, supplierController.create.bind(supplierController));

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier
 *     tags: [Suppliers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               contactEmail: { type: string, format: email }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       200:
 *         description: Supplier updated
 *       404:
 *         description: Not found
 */
router.put('/:id', auth, canWrite, supplierController.update.bind(supplierController));

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Soft delete a supplier
 *     tags: [Suppliers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Supplier deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', auth, canWrite, supplierController.delete.bind(supplierController));

export default router;
