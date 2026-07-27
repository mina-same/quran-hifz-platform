import { Router } from 'express';
import { login, me, logout, updateProfile, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login',           login);
router.get('/me',               authenticate, me);
router.post('/logout',          authenticate, logout);
router.put('/profile',          authenticate, updateProfile);
router.put('/change-password',  authenticate, changePassword);

export default router;
