import { Router } from 'express';
import { getAttendance, recordAttendance, bulkAttendance } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',       getAttendance);
router.post('/',      authorize('admin', 'teacher'), recordAttendance);
router.post('/bulk',  authorize('admin', 'teacher'), bulkAttendance);

export default router;
