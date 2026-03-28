import { Router } from 'express';
import { getDailySales, getSalesReport, getTopProducts, getPeakHours, getDashboardStats } from '../controllers/report.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardStats);
router.get('/daily', authenticateToken, getDailySales);
router.get('/sales', authenticateToken, requirePermission('report.view'), getSalesReport);
router.get('/top-products', authenticateToken, getTopProducts);
router.get('/peak-hours', authenticateToken, requirePermission('report.view'), getPeakHours);

export default router;
