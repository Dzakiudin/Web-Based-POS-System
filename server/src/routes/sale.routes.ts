import { Router } from 'express';
import { createSale, getSales, getSale, voidSale, refundSale } from '../controllers/sale.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getSales);
router.get('/:id', authenticateToken, getSale);
router.post('/', authenticateToken, createSale);
router.post('/:id/void', authenticateToken, requirePermission('void.transaction'), voidSale);
router.post('/:id/refund', authenticateToken, requirePermission('refund.process'), refundSale);

export default router;
