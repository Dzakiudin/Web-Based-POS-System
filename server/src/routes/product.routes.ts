import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getVariants, createVariant, updateVariant, deleteVariant } from '../controllers/product.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
    filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const router = Router();

// Products
router.get('/', authenticateToken, requirePermission('product.view', 'product.crud'), getProducts);
router.get('/:id', authenticateToken, requirePermission('product.view', 'product.crud'), getProduct);
router.post('/', authenticateToken, requirePermission('product.crud'), upload.single('image'), createProduct);
router.put('/:id', authenticateToken, requirePermission('product.crud'), upload.single('image'), updateProduct);
router.delete('/:id', authenticateToken, requirePermission('product.crud'), deleteProduct);

// Product Variants
router.get('/:productId/variants', authenticateToken, requirePermission('product.view', 'product.crud'), getVariants);
router.post('/:productId/variants', authenticateToken, requirePermission('product.crud'), createVariant);
router.put('/:productId/variants/:variantId', authenticateToken, requirePermission('product.crud'), updateVariant);
router.delete('/:productId/variants/:variantId', authenticateToken, requirePermission('product.crud'), deleteVariant);

export default router;
