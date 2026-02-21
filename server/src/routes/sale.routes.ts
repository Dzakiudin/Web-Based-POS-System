import { Router } from 'express';
import { createSale, getSales, getSale, voidSale, refundSale } from '../controllers/sale.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getSales);
router.get('/:id', authenticateToken, getSale);
router.post('/', authenticateToken, createSale);
router.post('/:id/void', authenticateToken, authorizeRole('ADMIN', 'OWNER'), voidSale);
router.post('/:id/refund', authenticateToken, authorizeRole('ADMIN', 'OWNER'), refundSale);

export default router;
