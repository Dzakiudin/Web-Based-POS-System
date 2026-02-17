import { Router } from 'express';
import { createSale, getSales, getSale } from '../controllers/sale.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getSales);
router.get('/:id', authenticateToken, getSale);
router.post('/', authenticateToken, createSale);

export default router;
