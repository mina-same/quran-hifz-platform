import { Router } from 'express';
import { getHomework, createHomework, reviewHomework, deleteHomework } from '../controllers/homework.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',       getHomework);
router.post('/',      authorize('admin', 'teacher'), createHomework);
router.patch('/:id',  authorize('admin', 'teacher'), reviewHomework);
router.delete('/:id', authorize('admin', 'teacher'), deleteHomework);

export default router;
