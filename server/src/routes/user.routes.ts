import { Router } from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, resetPassword } from '../controllers/user.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), getUsers);
router.get('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), getUser);
router.post('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), createUser);
router.put('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), updateUser);
router.delete('/:id', authenticateToken, authorizeRole('OWNER'), deleteUser);
router.post('/:id/reset-password', authenticateToken, authorizeRole('ADMIN', 'OWNER'), resetPassword);

export default router;
