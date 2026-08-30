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
// Admin is a superuser over halqat/tracks/teachers and reaches the plan tab of
// #trackdetail in both clients, where the edit/link/schedule controls render —
// leaving these teacher-only made every one of those buttons 403 for an admin.
// The per-student progress routes below were already opened up for exactly
// this reason.
router.post('/',      authorize('teacher', 'admin'), createPlan);
router.put('/:id',    authorize('teacher', 'admin'), updatePlan);
router.delete('/:id', authorize('teacher', 'admin'), deletePlan);
router.post('/:id/schedule/generate', authorize('teacher', 'admin'), generateSchedule);
// The edited day is addressed by (type, occurrenceIndex) — occurrenceIndex is
// 1-based within a segment, so the type travels in the body.
router.put('/:id/schedule/:occurrenceIndex', authorize('teacher', 'admin'), updateScheduleEntry);

// Admin's #trackdetail page reuses the exact same TeacherTrackDetail/
// IndividualPlanPanel components (see pageRegistry.ts) — the individual-plan
// panel must work identically for both roles, not just teacher.
router.get('/:id/students/:studentId/progress',                 getStudentProgress);
router.post('/:id/students/:studentId/progress/record',         authorize('teacher', 'admin'), recordOccurrence);
router.put('/:id/students/:studentId/schedule/:occurrenceIndex', authorize('teacher', 'admin'), updateStudentScheduleEntry);
router.post('/:id/students/:studentId/progress/reflow',         authorize('teacher', 'admin'), reflowNow);
router.post('/:id/students/:studentId/progress/init',           authorize('teacher', 'admin'), initStudentProgress);

export default router;
