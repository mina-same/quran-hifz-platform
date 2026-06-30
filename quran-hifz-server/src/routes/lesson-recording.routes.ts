import { Router } from 'express';
import { getRecordings, createRecording, deleteRecording } from '../controllers/lesson-recording.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',      getRecordings);
router.post('/',     authorize('admin', 'teacher'), createRecording);
router.delete('/:id', authorize('admin', 'teacher'), deleteRecording);

export default router;
