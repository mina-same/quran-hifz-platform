import { Router } from 'express';
import {
  getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher,
} from '../controllers/teacher.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',       getTeachers);
router.get('/:id',    getTeacher);
router.post('/',      authorize('admin'), createTeacher);
router.put('/:id',    authorize('admin'), updateTeacher);
router.delete('/:id', authorize('admin'), deleteTeacher);

export default router;
