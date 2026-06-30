import { Router } from 'express';
import {
  getStudents, getStudent, createStudent, updateStudent, deleteStudent,
} from '../controllers/student.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',     getStudents);
router.get('/:id',  getStudent);
router.post('/',    authorize('admin', 'teacher'), createStudent);
router.put('/:id',  authorize('admin', 'teacher'), updateStudent);
router.delete('/:id', authorize('admin'),          deleteStudent);

export default router;
