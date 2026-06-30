import { Router } from 'express';
import { login, me, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login',  login);
router.get('/me',      authenticate, me);
router.post('/logout', authenticate, logout);

export default router;
