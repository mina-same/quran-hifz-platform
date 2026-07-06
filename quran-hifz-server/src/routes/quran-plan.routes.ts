import { Router } from 'express';
import { getPlans, getPlan, createPlan, updatePlan, deletePlan, generateSchedule, updateScheduleEntry } from '../controllers/quran-plan.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',       getPlans);
router.get('/:id',    getPlan);
router.post('/',      authorize('teacher'), createPlan);
router.put('/:id',    authorize('teacher'), updatePlan);
router.delete('/:id', authorize('teacher'), deletePlan);
router.post('/:id/schedule/generate', authorize('teacher'), generateSchedule);
router.put('/:id/schedule/:occurrenceIndex', authorize('teacher'), updateScheduleEntry);

export default router;
