import { Router } from 'express';
import {
  getParents, createParent, updateParent, linkChild, unlinkChild,
  getStudentParent, setStudentParent,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/parents',                                  getParents);
router.post('/parents',                                 createParent);
router.put('/parents/:parentId',                        updateParent);
router.post('/parents/:parentId/children/:studentId',   linkChild);
router.delete('/parents/:parentId/children/:studentId', unlinkChild);

router.get('/students/:studentId/parent',  getStudentParent);
router.put('/students/:studentId/parent',  setStudentParent);

export default router;
