import { Router } from 'express';
import { signup, checkSlug, getBySlug, getCurrent } from '../controllers/tenant.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/signup',           signup);
router.get('/check-slug/:slug',  checkSlug);
router.get('/by-slug/:slug',     getBySlug);
router.get('/current',           authenticate, getCurrent);

export default router;
