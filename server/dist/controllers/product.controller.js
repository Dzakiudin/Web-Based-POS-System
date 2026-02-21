"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVariant = exports.updateVariant = exports.createVariant = exports.getVariants = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const getProducts = async (req, res) => {
    try {
        const { categoryId, search, active } = req.query;
        const where = {};
        if (active !== 'false')
            where.isActive = true;
        if (categoryId)
            where.categoryId = Number(categoryId);
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }
        const products = await database_1.default.product.findMany({
            where,
            include: {
                category: { select: { id: true, name: true, color: true } },
                variants: { where: { isActive: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(products);
    }
    catch (error) {
        logger_1.default.error('Error fetching products', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await database_1.default.product.findUnique({
            where: { id: Number(id) },
            include: {
                category: true,
                variants: true,
                stockMovements: { take: 20, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};
exports.getProduct = getProduct;
const createProduct = async (req, res) => {
    try {
        const { name, price, costPrice, stock, minStock, sku, barcode, categoryId } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const product = await database_1.default.product.create({
            data: {
                name,
                price: Number(price),
                costPrice: costPrice ? Number(costPrice) : 0,
                stock: Number(stock),
                minStock: minStock ? Number(minStock) : 5,
                sku: sku || null,
                barcode: barcode || null,
                categoryId: categoryId ? Number(categoryId) : null,
                image,
            },
            include: { category: true },
        });
        res.status(201).json(product);
    }
    catch (error) {
        logger_1.default.error('Error creating product', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, costPrice, stock, minStock, sku, barcode, categoryId, isActive } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : undefined;
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (price !== undefined)
            data.price = Number(price);
        if (costPrice !== undefined)
            data.costPrice = Number(costPrice);
        if (stock !== undefined)
            data.stock = Number(stock);
        if (minStock !== undefined)
            data.minStock = Number(minStock);
        if (sku !== undefined)
            data.sku = sku || null;
        if (barcode !== undefined)
            data.barcode = barcode || null;
        if (categoryId !== undefined)
            data.categoryId = categoryId ? Number(categoryId) : null;
        if (isActive !== undefined)
            data.isActive = isActive;
        if (image)
            data.image = image;
        const existing = await database_1.default.product.findUnique({ where: { id: Number(id) } });
        const product = await database_1.default.product.update({
            where: { id: Number(id) },
            data,
            include: { category: true },
        });
        if (existing && price !== undefined && Number(price) !== Number(existing.price)) {
            await database_1.default.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'UPDATE_PRICE',
                    entity: 'Product',
                    entityId: product.id,
                    details: JSON.stringify({ oldPrice: existing.price, newPrice: price }),
                    ip: req.ip || req.socket.remoteAddress || null,
                }
            }).catch(() => { });
        }
        res.json(product);
    }
    catch (error) {
        logger_1.default.error('Error updating product', error);
        res.status(500).json({ message: 'Error updating product' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete
        await database_1.default.product.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'Product deactivated' });
    }
    catch (error) {
        logger_1.default.error('Error deleting product', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};
exports.deleteProduct = deleteProduct;
// === Product Variant Endpoints ===
const getVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const variants = await database_1.default.productVariant.findMany({
            where: { productId: Number(productId), isActive: true },
        });
        res.json(variants);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching variants' });
    }
};
exports.getVariants = getVariants;
const createVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, sku, price, costPrice, stock } = req.body;
        const variant = await database_1.default.productVariant.create({
            data: {
                productId: Number(productId),
                name,
                sku: sku || null,
                price: Number(price),
                costPrice: costPrice ? Number(costPrice) : 0,
                stock: stock ? Number(stock) : 0,
            },
        });
        res.status(201).json(variant);
    }
    catch (error) {
        logger_1.default.error('Error creating variant', error);
        res.status(500).json({ message: 'Error creating variant' });
    }
};
exports.createVariant = createVariant;
const updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { name, sku, price, costPrice, stock, isActive } = req.body;
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (sku !== undefined)
            data.sku = sku || null;
        if (price !== undefined)
            data.price = Number(price);
        if (costPrice !== undefined)
            data.costPrice = Number(costPrice);
        if (stock !== undefined)
            data.stock = Number(stock);
        if (isActive !== undefined)
            data.isActive = isActive;
        const variant = await database_1.default.productVariant.update({
            where: { id: Number(variantId) },
            data,
        });
        res.json(variant);
    }
    catch (error) {
        logger_1.default.error('Error updating variant', error);
        res.status(500).json({ message: 'Error updating variant' });
    }
};
exports.updateVariant = updateVariant;
const deleteVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        await database_1.default.productVariant.update({
            where: { id: Number(variantId) },
            data: { isActive: false },
        });
        res.json({ message: 'Variant deactivated' });
    }
    catch (error) {
        logger_1.default.error('Error deleting variant', error);
        res.status(500).json({ message: 'Error deleting variant' });
    }
};
exports.deleteVariant = deleteVariant;
