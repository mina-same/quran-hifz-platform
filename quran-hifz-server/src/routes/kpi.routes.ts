import { Router } from 'express';
import { getKPIs, createKPI, updateKPI } from '../controllers/kpi.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',     getKPIs);
router.post('/',    authorize('admin'), createKPI);
router.put('/:id',  authorize('admin'), updateKPI);

export default router;
