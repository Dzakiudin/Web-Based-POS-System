import { Router } from 'express';
import { getStockMovements, createStockMovement, getLowStockProducts } from '../controllers/stock.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getStockMovements);
router.get('/low-stock', authenticateToken, getLowStockProducts);
router.post('/', authenticateToken, requirePermission('stock.in_out', 'stock.opname'), createStockMovement);

export default router;
