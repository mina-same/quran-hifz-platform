import { Router } from 'express';
import {
  getMessages, markRead, sendNoteToSupervisors, sendToParents,
  getContacts, getConversations, getThread, sendInThread, markThreadRead,
} from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',          getMessages);
router.post('/to-supervisors', authorize('student'), sendNoteToSupervisors);
router.post('/to-parents',     authorize('teacher', 'admin'), sendToParents);
router.patch('/:id/read', markRead);

// Teacher ↔ parent conversations
router.get('/contacts',              authorize('teacher', 'parent'), getContacts);
router.get('/conversations',         getConversations);
router.get('/with/:userId',          getThread);
router.post('/with/:userId',         authorize('teacher', 'parent'), sendInThread);
router.post('/with/:userId/read',    markThreadRead);

export default router;
