import { Router } from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, resetPassword } from '../controllers/user.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, requirePermission('user.manage', 'user.create_cashier'), getUsers);
router.get('/:id', authenticateToken, requirePermission('user.manage', 'user.create_cashier'), getUser);
router.post('/', authenticateToken, requirePermission('user.manage', 'user.create_cashier'), createUser);
router.put('/:id', authenticateToken, requirePermission('user.manage', 'user.create_cashier'), updateUser);
router.delete('/:id', authenticateToken, requirePermission('role.manage'), deleteUser);
router.post('/:id/reset-password', authenticateToken, requirePermission('user.manage', 'user.reset_pin'), resetPassword);

export default router;
