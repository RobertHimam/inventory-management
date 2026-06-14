import { Role } from '@inventory/shared-types';

export class AppError extends Error {
  public readonly statusCode: number;
  constructor(message: string, public readonly statusCodeNumber: number) {
    super(message);
    this.statusCode = statusCodeNumber;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}
