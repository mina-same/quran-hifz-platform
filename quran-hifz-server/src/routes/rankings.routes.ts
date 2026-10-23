import { Router } from 'express';
import { getRankings, getMyRanking } from '../controllers/rankings.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);
router.get('/',   authorize('admin', 'supervisor'), getRankings);
router.get('/me', authorize('student'), getMyRanking);

export default router;
