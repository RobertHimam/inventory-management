import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router: Router = Router();

router.get('/health', healthController);

export default router;
