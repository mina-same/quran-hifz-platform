import { Router } from 'express';
import { getMasajid, getMasjid, createMasjid, updateMasjid, deleteMasjid } from '../controllers/masjid.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',     getMasajid);
router.get('/:id',  getMasjid);
router.post('/',    authorize('admin'), createMasjid);
router.put('/:id',    authorize('admin'), updateMasjid);
router.delete('/:id', authorize('admin'), deleteMasjid);

export default router;
