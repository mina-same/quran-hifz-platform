import { Router } from 'express';
import { login, me, logout, updateProfile, changePassword, registerPushToken } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login',           login);
router.get('/me',               authenticate, me);
router.post('/logout',          authenticate, logout);
router.put('/profile',          authenticate, updateProfile);
router.put('/change-password',  authenticate, changePassword);
router.put('/push-token',       authenticate, registerPushToken);

export default router;
