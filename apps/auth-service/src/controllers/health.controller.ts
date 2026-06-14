import { Request, Response } from 'express';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: string
 *                    example: ok
 */
export const health = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ status: 'ok' });
};
