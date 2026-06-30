import { Router } from 'express';
import { getGroupHomework, createGroupHomework, deleteGroupHomework } from '../controllers/group-homework.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',       getGroupHomework);
router.post('/',      authorize('admin', 'teacher'), createGroupHomework);
router.delete('/:id', authorize('admin', 'teacher'), deleteGroupHomework);

export default router;
