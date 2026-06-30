import { Router } from 'express';
import { getMessages, sendMessage, markRead } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/',          getMessages);
router.post('/',         sendMessage);
router.patch('/:id/read', markRead);

export default router;
