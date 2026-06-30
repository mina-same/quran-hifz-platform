import { Router } from 'express';
import {
  getChildren,
  getChildHifz,
  getChildAttendance,
  getChildHomework,
  getChildRecordings,
  getChildMessages,
} from '../controllers/parent.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate, authorize('parent', 'admin'));

router.get('/children',                              getChildren);
router.get('/children/:studentId/hifz',              getChildHifz);
router.get('/children/:studentId/attendance',        getChildAttendance);
router.get('/children/:studentId/homework',          getChildHomework);
router.get('/children/:studentId/recordings',        getChildRecordings);
router.get('/children/:studentId/messages',          getChildMessages);

export default router;
