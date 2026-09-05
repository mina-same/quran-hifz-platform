import { Router } from 'express';
import {
  getTracks, getTrack, createTrack, updateTrack, assignStudent, deleteTrack,
} from '../controllers/track.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',              getTracks);
router.get('/:id',           getTrack);
router.post('/',             authorize('admin'), createTrack);
router.put('/:id',           authorize('admin'), updateTrack);
router.post('/:id/assign',   authorize('admin', 'teacher'), assignStudent);
router.delete('/:id',        authorize('admin'), deleteTrack);

export default router;
