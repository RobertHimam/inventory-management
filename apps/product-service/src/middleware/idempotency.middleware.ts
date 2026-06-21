import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import IdempotencyKey from '../models/idempotency.model';

export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Only apply to write operations
  if (req.method === 'GET') {
    return next();
  }

  const key = req.headers['idempotency-key'];

  if (key === undefined) {
    res.status(400).json({
      success: false,
      error: 'Idempotency-Key header is required',
    });
    return;
  }

  const keyStr = Array.isArray(key) ? key[0] : key;

  if (!keyStr.trim()) {
    res.status(400).json({
      success: false,
      error: 'Idempotency-Key header cannot be empty',
    });
    return;
  }

  const endpoint = `${req.method} ${req.originalUrl || req.baseUrl || req.path}`;
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  try {
    // Attempt to insert a processing record to acquire the lock
    const lock = new IdempotencyKey({
      key: keyStr,
      endpoint,
      requestHash,
      status: 'processing',
    });

    await lock.save();

    // Successfully acquired lock (key was not present)
    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function (body: unknown): Response {
      const statusCode = res.statusCode;

      if (statusCode < 500) {
        IdempotencyKey.updateOne(
          { key: keyStr },
          {
            status: 'completed',
            responseCode: statusCode,
            responseBody: body,
          }
        ).catch((_err) => {});
      } else {
        IdempotencyKey.deleteOne({ key: keyStr }).catch((_err) => {});
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (error: unknown) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      try {
        const existingRecord = await IdempotencyKey.findOne({ key: keyStr });
        if (!existingRecord) {
          res.status(500).json({ success: false, error: 'Idempotency conflict' });
          return;
        }

        if (existingRecord.status === 'processing') {
          res.status(409).json({
            success: false,
            error: 'An identical request is already in progress',
          });
          return;
        }

        if (existingRecord.status === 'completed') {
          if (existingRecord.requestHash !== requestHash) {
            res.status(400).json({
              success: false,
              error: 'Idempotency key was used for a different request payload',
            });
            return;
          }

          res.status(existingRecord.responseCode || 200).json(existingRecord.responseBody);
          return;
        }
      } catch (findError) {
        res.status(500).json({
          success: false,
          error: 'Internal server error while processing idempotency',
        });
        return;
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error while processing idempotency',
      });
      return;
    }
  }
};
