import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { registerSchema, loginSchema } from '@inventory/shared-auth';
import { ValidationError } from '../errors';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { EventBus } from '@inventory/shared-rabbitmq';
import { Logger } from '@inventory/shared-logger';
import { config } from '../config';
import { AuthService } from '../services/auth.service';

const router = Router();

// Dependency setup
const userRepo = new UserRepository();
const refreshRepo = new RefreshTokenRepository();
const eventBus = EventBus.create();
const logger = new Logger({ service: 'auth-service' });
const authService = new AuthService(userRepo, refreshRepo, eventBus, logger, config);
const authController = new AuthController(authService);

// Validation middleware
const validate = (schema: any) => (req: any, res: any, next: any) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err: any) {
    if (err.errors) {
      const messages = err.errors.map((e: any) => e.message).join(', ');
      next(new ValidationError(messages));
    } else {
      next(err);
    }
  }
};

router.post('/register', validate(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);
router.post('/login', validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);
router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next)
);
router.post('/logout', (req, res, next) =>
  authController.logout(req, res, next)
);

export default router;
