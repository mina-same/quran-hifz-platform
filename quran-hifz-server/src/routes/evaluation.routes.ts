import { Router } from 'express';
import { getEvaluations, bulkEvaluate, getRubric, getGradeChanges } from '../controllers/evaluation.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/rubric', getRubric);
router.get('/changes', authorize('admin', 'supervisor'), getGradeChanges);
router.get('/',      getEvaluations);
router.post('/bulk', authorize('admin', 'teacher'), bulkEvaluate);

export default router;
