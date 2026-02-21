"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundSale = exports.voidSale = exports.getSale = exports.getSales = exports.createSale = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const SaleDetailSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    variantId: zod_1.z.number().int().positive().optional().nullable(),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().positive(),
    discountAmount: zod_1.z.number().min(0).optional(),
    subtotal: zod_1.z.number().positive(),
});
const SaleSchema = zod_1.z.object({
    customerId: zod_1.z.number().nullable().optional(),
    discountAmount: zod_1.z.number().min(0).optional(),
    notes: zod_1.z.string().optional(),
    details: zod_1.z.array(SaleDetailSchema).min(1),
    payments: zod_1.z.array(zod_1.z.object({
        method: zod_1.z.enum(['CASH', 'QRIS', 'CARD', 'EWALLET']),
        amount: zod_1.z.number().positive(),
        change: zod_1.z.number().min(0).optional(),
        reference: zod_1.z.string().optional(),
    })).min(1),
});
// Generate a receipt number: RCP-YYYYMMDD-XXXXXX
function generateReceiptNumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCP-${date}-${rand}`;
}
const createSale = async (req, res) => {
    try {
        const validated = SaleSchema.parse(req.body);
        const userId = req.user?.id || null;
        const totalPrice = validated.details.reduce((sum, d) => sum + d.subtotal, 0);
        const discountAmount = validated.discountAmount || 0;
        const finalPrice = totalPrice - discountAmount;
        const receiptNumber = generateReceiptNumber();
        // Check for active cash session
        let cashSessionId = null;
        if (userId) {
            const activeSession = await database_1.default.cashSession.findFirst({
                where: { userId, status: 'OPEN' },
            });
            cashSessionId = activeSession?.id || null;
        }
        const sale = await database_1.default.$transaction(async (tx) => {
            // Create the sale
            const newSale = await tx.sale.create({
                data: {
                    receiptNumber,
                    totalPrice,
                    discountAmount,
                    finalPrice,
                    customerId: validated.customerId || null,
                    userId,
                    cashSessionId,
                    notes: validated.notes,
                    details: {
                        create: validated.details.map(d => ({
                            productId: d.productId,
                            variantId: d.variantId || null,
                            quantity: d.quantity,
                            unitPrice: d.unitPrice,
                            discountAmount: d.discountAmount || 0,
                            subtotal: d.subtotal,
                        })),
                    },
                    payments: {
                        create: validated.payments.map(p => ({
                            method: p.method,
                            amount: p.amount,
                            change: p.change || 0,
                            reference: p.reference,
                        })),
                    },
                },
                include: {
                    details: { include: { product: true } },
                    payments: true,
                    customer: true,
                },
            });
            // Decrement stock for each product
            for (const detail of validated.details) {
                await tx.product.update({
                    where: { id: detail.productId },
                    data: { stock: { decrement: detail.quantity } },
                });
                // Record stock movement
                await tx.stockMovement.create({
                    data: {
                        productId: detail.productId,
                        type: 'SALE',
                        quantity: detail.quantity,
                        reason: `Sale ${receiptNumber}`,
                        reference: receiptNumber,
                        userId,
                    },
                });
            }
            // Update customer loyalty points if applicable
            if (validated.customerId) {
                const pointsEarned = Math.floor(finalPrice / 10000); // 1 point per 10k
                await tx.customer.update({
                    where: { id: validated.customerId },
                    data: {
                        loyaltyPoints: { increment: pointsEarned },
                        totalSpent: { increment: finalPrice },
                    },
                });
            }
            return newSale;
        });
        res.status(201).json(sale);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Sale creation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createSale = createSale;
const getSales = async (req, res) => {
    try {
        const { status, limit = '50', offset = '0', startDate, endDate } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }
        const [sales, total] = await Promise.all([
            database_1.default.sale.findMany({
                where,
                include: {
                    customer: { select: { name: true } },
                    user: { select: { name: true } },
                    payments: true,
                    _count: { select: { details: true } },
                },
                orderBy: { date: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            database_1.default.sale.count({ where }),
        ]);
        res.json({ sales, total });
    }
    catch (error) {
        logger_1.default.error('Error fetching sales', error);
        res.status(500).json({ message: 'Error fetching sales' });
    }
};
exports.getSales = getSales;
const getSale = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await database_1.default.sale.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                user: { select: { name: true, role: true } },
                details: { include: { product: true, variant: true } },
                payments: true,
            },
        });
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sale' });
    }
};
exports.getSale = getSale;
const voidSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason)
            return res.status(400).json({ message: 'Void reason required' });
        const sale = await database_1.default.sale.findUnique({
            where: { id: Number(id) },
            include: { details: true },
        });
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        if (sale.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Only completed sales can be voided' });
        }
        await database_1.default.$transaction(async (tx) => {
            // Void the sale
            await tx.sale.update({
                where: { id: Number(id) },
                data: { status: 'VOIDED', refundReason: reason },
            });
            await tx.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'VOID_SALE',
                    entity: 'Sale',
                    entityId: Number(id),
                    details: JSON.stringify({ reason }),
                    ip: req.ip || req.socket.remoteAddress || null,
                }
            });
            // Restore stock
            for (const detail of sale.details) {
                await tx.product.update({
                    where: { id: detail.productId },
                    data: { stock: { increment: detail.quantity } },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: detail.productId,
                        type: 'REFUND',
                        quantity: detail.quantity,
                        reason: `Void: ${reason}`,
                        reference: sale.receiptNumber,
                        userId: req.user?.id,
                    },
                });
            }
            // Reverse customer loyalty if applicable
            if (sale.customerId) {
                const pointsToRemove = Math.floor(Number(sale.finalPrice) / 10000);
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: {
                        loyaltyPoints: { decrement: pointsToRemove },
                        totalSpent: { decrement: Number(sale.finalPrice) },
                    },
                });
            }
        });
        res.json({ message: 'Sale voided successfully' });
    }
    catch (error) {
        logger_1.default.error('Error voiding sale', error);
        res.status(500).json({ message: 'Error voiding sale' });
    }
};
exports.voidSale = voidSale;
const refundSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason)
            return res.status(400).json({ message: 'Refund reason required' });
        const sale = await database_1.default.sale.findUnique({
            where: { id: Number(id) },
            include: { details: true },
        });
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        if (sale.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Only completed sales can be refunded' });
        }
        await database_1.default.$transaction(async (tx) => {
            await tx.sale.update({
                where: { id: Number(id) },
                data: { status: 'REFUNDED', refundReason: reason },
            });
            await tx.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'REFUND_SALE',
                    entity: 'Sale',
                    entityId: Number(id),
                    details: JSON.stringify({ reason }),
                    ip: req.ip || req.socket.remoteAddress || null,
                }
            });
            for (const detail of sale.details) {
                await tx.product.update({
                    where: { id: detail.productId },
                    data: { stock: { increment: detail.quantity } },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: detail.productId,
                        type: 'REFUND',
                        quantity: detail.quantity,
                        reason: `Refund: ${reason}`,
                        reference: sale.receiptNumber,
                        userId: req.user?.id,
                    },
                });
            }
            if (sale.customerId) {
                const pointsToRemove = Math.floor(Number(sale.finalPrice) / 10000);
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: {
                        loyaltyPoints: { decrement: pointsToRemove },
                        totalSpent: { decrement: Number(sale.finalPrice) },
                    },
                });
            }
        });
        res.json({ message: 'Sale refunded successfully' });
    }
    catch (error) {
        logger_1.default.error('Error refunding sale', error);
        res.status(500).json({ message: 'Error refunding sale' });
    }
};
exports.refundSale = refundSale;
