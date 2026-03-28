import { Router } from 'express';
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount, validatePromoCode } from '../controllers/discount.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getDiscounts);
router.post('/', authenticateToken, requirePermission('discount.manage'), createDiscount);
router.put('/:id', authenticateToken, requirePermission('discount.manage'), updateDiscount);
router.delete('/:id', authenticateToken, requirePermission('discount.manage'), deleteDiscount);
router.post('/validate', authenticateToken, validatePromoCode);

export default router;
