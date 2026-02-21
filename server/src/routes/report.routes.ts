import { Router } from 'express';
import { getDailySales, getSalesReport, getTopProducts, getPeakHours, getDashboardStats } from '../controllers/report.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardStats);
router.get('/daily', authenticateToken, getDailySales);
router.get('/sales', authenticateToken, authorizeRole('ADMIN', 'OWNER'), getSalesReport);
router.get('/top-products', authenticateToken, getTopProducts);
router.get('/peak-hours', authenticateToken, authorizeRole('ADMIN', 'OWNER'), getPeakHours);

export default router;
