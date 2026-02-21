import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, requirePermission('activity_log.view'), getAuditLogs);

export default router;
