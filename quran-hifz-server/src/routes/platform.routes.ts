import { Router } from 'express';
import { platformLogin, platformMe, listTenants, updateTenant } from '../controllers/platform.controller';
import { authenticatePlatform } from '../middleware/platformAuth';

const router = Router();

router.post('/login',         platformLogin);
router.get('/me',             authenticatePlatform, platformMe);
router.get('/tenants',        authenticatePlatform, listTenants);
router.patch('/tenants/:id',  authenticatePlatform, updateTenant);

export default router;
