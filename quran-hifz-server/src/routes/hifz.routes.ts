import { Router } from 'express';
import { getHifzPlan, upsertEntry, deleteEntry } from '../controllers/hifz.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/:studentId',  getHifzPlan);
router.post('/',           authorize('admin', 'teacher'), upsertEntry);
router.delete('/:id',      authorize('admin', 'teacher'), deleteEntry);

export default router;
