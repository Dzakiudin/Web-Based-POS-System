import { Router } from 'express';
import { getStockMovements, createStockMovement, getLowStockProducts } from '../controllers/stock.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getStockMovements);
router.get('/low-stock', authenticateToken, getLowStockProducts);
router.post('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), createStockMovement);

export default router;
