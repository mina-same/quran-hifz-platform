import { Router } from 'express';
import { getDraft, sendReport, listReports } from '../controllers/daily-report.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

// Read: admin (all), supervisor (their gender's masajid), teacher (own tracks).
router.get('/',       authorize('admin', 'supervisor', 'teacher'), listReports);
// Write: the teacher after the session (admin may send on their behalf).
router.get('/draft',  authorize('admin', 'teacher'), getDraft);
router.post('/',      authorize('admin', 'teacher'), sendReport);

export default router;
