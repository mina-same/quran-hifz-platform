import { Router } from 'express';
import { getEvaluations, bulkEvaluate } from '../controllers/evaluation.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',      getEvaluations);
router.post('/bulk', authorize('admin', 'teacher'), bulkEvaluate);

export default router;
