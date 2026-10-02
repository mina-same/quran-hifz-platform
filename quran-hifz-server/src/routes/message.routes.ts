import { Router } from 'express';
import { getMessages, sendMessage, markRead, sendNoteToSupervisors } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',          getMessages);
router.post('/',         sendMessage);
router.post('/to-supervisors', authorize('student'), sendNoteToSupervisors);
router.patch('/:id/read', markRead);

export default router;
