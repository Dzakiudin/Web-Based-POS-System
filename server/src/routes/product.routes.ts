import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getVariants, createVariant, updateVariant, deleteVariant } from '../controllers/product.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
    filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const router = Router();

// Products
router.get('/', authenticateToken, getProducts);
router.get('/:id', authenticateToken, getProduct);
router.post('/', authenticateToken, authorizeRole('ADMIN', 'OWNER'), upload.single('image'), createProduct);
router.put('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), upload.single('image'), updateProduct);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN', 'OWNER'), deleteProduct);

// Product Variants
router.get('/:productId/variants', authenticateToken, getVariants);
router.post('/:productId/variants', authenticateToken, authorizeRole('ADMIN', 'OWNER'), createVariant);
router.put('/:productId/variants/:variantId', authenticateToken, authorizeRole('ADMIN', 'OWNER'), updateVariant);
router.delete('/:productId/variants/:variantId', authenticateToken, authorizeRole('ADMIN', 'OWNER'), deleteVariant);

export default router;
