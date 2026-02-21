"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockProducts = exports.createStockMovement = exports.getStockMovements = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const StockMovementSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    type: zod_1.z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
});
const getStockMovements = async (req, res) => {
    try {
        const { productId, type, limit = '50' } = req.query;
        const where = {};
        if (productId)
            where.productId = Number(productId);
        if (type)
            where.type = type;
        const movements = await database_1.default.stockMovement.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
        });
        res.json(movements);
    }
    catch (error) {
        logger_1.default.error('Error fetching stock movements', error);
        res.status(500).json({ message: 'Error fetching stock movements' });
    }
};
exports.getStockMovements = getStockMovements;
const createStockMovement = async (req, res) => {
    try {
        const validated = StockMovementSchema.parse(req.body);
        const userId = req.user.id;
        const result = await database_1.default.$transaction(async (tx) => {
            // Create the stock movement record
            const movement = await tx.stockMovement.create({
                data: {
                    productId: validated.productId,
                    type: validated.type,
                    quantity: validated.quantity,
                    reason: validated.reason,
                    reference: validated.reference,
                    userId,
                },
            });
            await tx.auditLog.create({
                data: {
                    userId,
                    action: 'MANUAL_STOCK',
                    entity: 'Product',
                    entityId: validated.productId,
                    details: JSON.stringify({ type: validated.type, quantity: validated.quantity, reason: validated.reason }),
                    ip: req.ip || req.socket.remoteAddress || null,
                }
            });
            // Update product stock accordingly
            let stockChange = 0;
            switch (validated.type) {
                case 'IN':
                    stockChange = validated.quantity;
                    break;
                case 'OUT':
                    stockChange = -validated.quantity;
                    break;
                case 'ADJUSTMENT':
                    // For adjustment, set the stock to the exact quantity
                    await tx.product.update({
                        where: { id: validated.productId },
                        data: { stock: validated.quantity },
                    });
                    return movement;
            }
            if (stockChange !== 0) {
                await tx.product.update({
                    where: { id: validated.productId },
                    data: { stock: { increment: stockChange } },
                });
            }
            return movement;
        });
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error creating stock movement', error);
        res.status(500).json({ message: 'Error creating stock movement' });
    }
};
exports.createStockMovement = createStockMovement;
const getLowStockProducts = async (req, res) => {
    try {
        const products = await database_1.default.product.findMany({
            where: {
                isActive: true,
            },
            include: {
                category: { select: { name: true, color: true } },
            },
            orderBy: { stock: 'asc' },
        });
        // Filter products where stock <= minStock
        const lowStock = products.filter(p => p.stock <= p.minStock);
        res.json(lowStock);
    }
    catch (error) {
        logger_1.default.error('Error fetching low stock products', error);
        res.status(500).json({ message: 'Error fetching low stock products' });
    }
};
exports.getLowStockProducts = getLowStockProducts;
