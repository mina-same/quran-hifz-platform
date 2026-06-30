import { Router } from 'express';
import {
  getHalqat, getHalqa, createHalqa, updateHalqa, deleteHalqa,
} from '../controllers/halqa.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',       getHalqat);
router.get('/:id',    getHalqa);
router.post('/',      authorize('admin'),           createHalqa);
router.put('/:id',    authorize('admin', 'teacher'), updateHalqa);
router.delete('/:id', authorize('admin'),            deleteHalqa);

export default router;
