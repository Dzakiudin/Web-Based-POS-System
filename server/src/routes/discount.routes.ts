import { Router } from 'express';
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount, validatePromoCode } from '../controllers/discount.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getDiscounts);
router.post('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), createDiscount);
router.put('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), updateDiscount);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), deleteDiscount);
router.post('/validate', authenticateToken, validatePromoCode);

export default router;
