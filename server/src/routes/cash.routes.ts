import { Router } from 'express';
import { openSession, closeSession, addMovement, getSessions, getActiveSession } from '../controllers/cash.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getSessions);
router.get('/active', authenticateToken, getActiveSession);
router.post('/open', authenticateToken, openSession);
router.post('/:id/close', authenticateToken, closeSession);
router.post('/:id/movement', authenticateToken, addMovement);

export default router;
