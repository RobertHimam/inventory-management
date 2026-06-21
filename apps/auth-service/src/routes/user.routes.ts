import { Router } from 'express';
import { authenticate, authorize } from '@inventory/shared-auth';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/UserService';
import { UserController } from '../controllers/UserController';
import { config } from '../config';

const router: Router = Router();

const userRepo = new UserRepository();
const userService = new UserService(userRepo);
const userController = new UserController(userService);

const auth = authenticate(config.jwtSecret);
const canList = authorize(['user:read']);

router.get('/', auth, canList, (req, res, next) => userController.list(req, res, next));

export default router;
