import { Router } from 'express';
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getCategories);
router.get('/:id', authenticateToken, getCategory);
router.post('/', authenticateToken, requirePermission('category.manage'), createCategory);
router.put('/:id', authenticateToken, requirePermission('category.manage'), updateCategory);
router.delete('/:id', authenticateToken, requirePermission('category.manage'), deleteCategory);

export default router;
