import { Router } from 'express';
import { getDashboardStats, getDashboardAlerts } from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);
router.get('/dashboard', getDashboardStats);
router.get('/alerts', authorize('admin', 'supervisor'), getDashboardAlerts);

export default router;
