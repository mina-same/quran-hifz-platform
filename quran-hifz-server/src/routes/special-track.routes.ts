import { Router } from 'express';
import { getTracks, createTrack, updateTrack, enrollStudent, unenrollStudent, deleteTrack } from '../controllers/special-track.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',              getTracks);
router.post('/',             authorize('admin'), createTrack);
router.put('/:id',           authorize('admin'), updateTrack);
router.post('/:id/enroll',   authorize('admin', 'teacher'), enrollStudent);
router.post('/:id/unenroll', authorize('admin', 'teacher'), unenrollStudent);
router.delete('/:id',        authorize('admin'), deleteTrack);

export default router;
