import { Request, Response, NextFunction } from 'express';
import { ValidationError, AuthenticationError, ConflictError, NotFoundError } from '../errors';

export const errorMiddleware = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let status = 500;
  let message = 'Internal server error';

  if (err instanceof ValidationError) {
    status = 400;
    message = err.message;
  } else if (err instanceof AuthenticationError) {
    status = 401;
    message = err.message;
  } else if (err instanceof ConflictError) {
    status = 409;
    message = err.message;
  } else if (err instanceof NotFoundError) {
    status = 404;
    message = err.message;
  } else if (err.name === 'ZodError') {
    status = 400;
    message = err.errors.map((e: any) => e.message).join(', ');
  } else if (err.message) {
    message = err.message;
  }

  const response: any = { status, message };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }
  res.status(status).json(response);
};
