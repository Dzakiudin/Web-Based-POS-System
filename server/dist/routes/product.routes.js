"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, path_1.default.join(__dirname, '..', '..', 'uploads')),
    filename: (_req, file, cb) => cb(null, Date.now() + path_1.default.extname(file.originalname)),
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// Products
router.get('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.view', 'product.crud'), product_controller_1.getProducts);
router.get('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.view', 'product.crud'), product_controller_1.getProduct);
router.post('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.crud'), upload.single('image'), product_controller_1.createProduct);
router.put('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.crud'), upload.single('image'), product_controller_1.updateProduct);
router.delete('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.crud'), product_controller_1.deleteProduct);
// Product Variants
router.get('/:productId/variants', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.view', 'product.crud'), product_controller_1.getVariants);
router.post('/:productId/variants', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.crud'), product_controller_1.createVariant);
router.put('/:productId/variants/:variantId', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.crud'), product_controller_1.updateVariant);
router.delete('/:productId/variants/:variantId', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requirePermission)('product.crud'), product_controller_1.deleteVariant);
exports.default = router;
