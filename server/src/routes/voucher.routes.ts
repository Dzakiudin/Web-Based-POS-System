import { Router } from 'express';
import { getVouchers, createVoucher, deleteVoucher, validateVoucher, useVoucher } from '../controllers/voucher.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getVouchers);
router.post('/', authorizeRole('ADMIN', 'OWNER'), createVoucher);
router.delete('/:id', authorizeRole('ADMIN', 'OWNER'), deleteVoucher);
router.get('/validate/:code', validateVoucher);
router.post('/:id/use', useVoucher);

export default router;
