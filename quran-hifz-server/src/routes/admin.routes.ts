import { Router } from 'express';
import {
  getParents, createParent, updateParent, linkChild, unlinkChild,
  getStudentParent, setStudentParent,
  getSupervisors, createSupervisor, deleteSupervisor,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

// A supervisor's portal reuses AdminParents/AdminStudents in read-only mode
// (see PortalContext's `readOnly = role === 'supervisor'`) — reads are open
// to both roles, writes stay admin-only.
router.get('/parents',                                  authorize('admin', 'supervisor'), getParents);
router.post('/parents',                                 authorize('admin'), createParent);
router.put('/parents/:parentId',                        authorize('admin'), updateParent);
router.post('/parents/:parentId/children/:studentId',   authorize('admin'), linkChild);
router.delete('/parents/:parentId/children/:studentId', authorize('admin'), unlinkChild);

router.get('/students/:studentId/parent',  authorize('admin', 'supervisor'), getStudentParent);
router.put('/students/:studentId/parent',  authorize('admin'), setStudentParent);

router.get('/supervisors',                    authorize('admin'), getSupervisors);
router.post('/supervisors',                   authorize('admin'), createSupervisor);
router.delete('/supervisors/:supervisorId',   authorize('admin'), deleteSupervisor);

export default router;
