import { Router } from 'express';
import { getVouchers, createVoucher, deleteVoucher, validateVoucher, useVoucher } from '../controllers/voucher.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getVouchers);
router.post('/', requirePermission('discount.manage'), createVoucher);
router.delete('/:id', requirePermission('discount.manage'), deleteVoucher);
router.get('/validate/:code', validateVoucher);
router.post('/:id/use', useVoucher);

export default router;
