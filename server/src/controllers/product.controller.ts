import { Request, Response } from 'express';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const { categoryId, search, active } = req.query;

        const where: any = {};
        if (active !== 'false') where.isActive = true;
        if (categoryId) where.categoryId = Number(categoryId);
        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { sku: { contains: search as string, mode: 'insensitive' } },
                { barcode: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                category: { select: { id: true, name: true, color: true } },
                variants: { where: { isActive: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(products);
    } catch (error) {
        logger.error('Error fetching products', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
};

export const getProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
            include: {
                category: true,
                variants: true,
                stockMovements: { take: 20, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { name, price, costPrice, stock, minStock, sku, barcode, categoryId } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const product = await prisma.product.create({
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
    } catch (error) {
        logger.error('Error creating product', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, price, costPrice, stock, minStock, sku, barcode, categoryId, isActive } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : undefined;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (price !== undefined) data.price = Number(price);
        if (costPrice !== undefined) data.costPrice = Number(costPrice);
        if (stock !== undefined) data.stock = Number(stock);
        if (minStock !== undefined) data.minStock = Number(minStock);
        if (sku !== undefined) data.sku = sku || null;
        if (barcode !== undefined) data.barcode = barcode || null;
        if (categoryId !== undefined) data.categoryId = categoryId ? Number(categoryId) : null;
        if (isActive !== undefined) data.isActive = isActive;
        if (image) data.image = image;

        const existing = await prisma.product.findUnique({ where: { id: Number(id) } });

        const product = await prisma.product.update({
            where: { id: Number(id) },
            data,
            include: { category: true },
        });

        if (existing && price !== undefined && Number(price) !== Number(existing.price)) {
            await prisma.auditLog.create({
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
    } catch (error) {
        logger.error('Error updating product', error);
        res.status(500).json({ message: 'Error updating product' });
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Soft delete
        await prisma.product.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'Product deactivated' });
    } catch (error) {
        logger.error('Error deleting product', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};

// === Product Variant Endpoints ===

export const getVariants = async (req: AuthRequest, res: Response) => {
    try {
        const { productId } = req.params;
        const variants = await prisma.productVariant.findMany({
            where: { productId: Number(productId), isActive: true },
        });
        res.json(variants);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching variants' });
    }
};

export const createVariant = async (req: AuthRequest, res: Response) => {
    try {
        const { productId } = req.params;
        const { name, sku, price, costPrice, stock } = req.body;

        const variant = await prisma.productVariant.create({
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
    } catch (error) {
        logger.error('Error creating variant', error);
        res.status(500).json({ message: 'Error creating variant' });
    }
};

export const updateVariant = async (req: AuthRequest, res: Response) => {
    try {
        const { variantId } = req.params;
        const { name, sku, price, costPrice, stock, isActive } = req.body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (sku !== undefined) data.sku = sku || null;
        if (price !== undefined) data.price = Number(price);
        if (costPrice !== undefined) data.costPrice = Number(costPrice);
        if (stock !== undefined) data.stock = Number(stock);
        if (isActive !== undefined) data.isActive = isActive;

        const variant = await prisma.productVariant.update({
            where: { id: Number(variantId) },
            data,
        });
        res.json(variant);
    } catch (error) {
        logger.error('Error updating variant', error);
        res.status(500).json({ message: 'Error updating variant' });
    }
};

export const deleteVariant = async (req: AuthRequest, res: Response) => {
    try {
        const { variantId } = req.params;
        await prisma.productVariant.update({
            where: { id: Number(variantId) },
            data: { isActive: false },
        });
        res.json({ message: 'Variant deactivated' });
    } catch (error) {
        logger.error('Error deleting variant', error);
        res.status(500).json({ message: 'Error deleting variant' });
    }
};
