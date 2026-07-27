import { Router } from 'express';
import { getPlans, getPlan, createPlan, updatePlan, deletePlan, generateSchedule, updateScheduleEntry } from '../controllers/quran-plan.controller';
import {
  getStudentProgress, recordOccurrence, updateStudentScheduleEntry, reflowNow, initStudentProgress,
} from '../controllers/student-plan-progress.controller';
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

// Admin's #trackdetail page reuses the exact same TeacherTrackDetail/
// IndividualPlanPanel components (see pageRegistry.ts) — the individual-plan
// panel must work identically for both roles, not just teacher.
router.get('/:id/students/:studentId/progress',                 getStudentProgress);
router.post('/:id/students/:studentId/progress/record',         authorize('teacher', 'admin'), recordOccurrence);
router.put('/:id/students/:studentId/schedule/:occurrenceIndex', authorize('teacher', 'admin'), updateStudentScheduleEntry);
router.post('/:id/students/:studentId/progress/reflow',         authorize('teacher', 'admin'), reflowNow);
router.post('/:id/students/:studentId/progress/init',           authorize('teacher', 'admin'), initStudentProgress);

export default router;
