import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller';
import { authenticateToken } from '../middleware/auth.middleware';

import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', authenticateToken, getProducts);
router.get('/:id', authenticateToken, getProduct);
router.post('/', authenticateToken, upload.single('image'), createProduct);
router.put('/:id', authenticateToken, upload.single('image'), updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

export default router;
