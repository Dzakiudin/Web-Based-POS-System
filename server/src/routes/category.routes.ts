import { Router } from 'express';
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getCategories);
router.get('/:id', authenticateToken, getCategory);
router.post('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), createCategory);
router.put('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), updateCategory);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), deleteCategory);

export default router;
