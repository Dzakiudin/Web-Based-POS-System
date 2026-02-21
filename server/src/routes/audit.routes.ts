import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), getAuditLogs);

export default router;
