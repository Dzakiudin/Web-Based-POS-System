import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const SaleDetailSchema = z.object({
    productId: z.number().int().positive(),
    variantId: z.number().int().positive().optional().nullable(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    discountAmount: z.number().min(0).optional(),
    subtotal: z.number().positive(),
});

const SaleSchema = z.object({
    customerId: z.number().nullable().optional(),
    discountAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
    details: z.array(SaleDetailSchema).min(1),
    payments: z.array(z.object({
        method: z.enum(['CASH', 'QRIS', 'CARD', 'EWALLET']),
        amount: z.number().positive(),
        change: z.number().min(0).optional(),
        reference: z.string().optional(),
    })).min(1),
});

// Generate a receipt number: RCP-YYYYMMDD-XXXXXX
function generateReceiptNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCP-${date}-${rand}`;
}

export const createSale = async (req: AuthRequest, res: Response) => {
    try {
        const validated = SaleSchema.parse(req.body);
        const userId = req.user?.id || null;

        const totalPrice = validated.details.reduce((sum, d) => sum + d.subtotal, 0);
        const discountAmount = validated.discountAmount || 0;
        const finalPrice = totalPrice - discountAmount;
        const receiptNumber = generateReceiptNumber();

        // Check for active cash session
        let cashSessionId: number | null = null;
        if (userId) {
            const activeSession = await prisma.cashSession.findFirst({
                where: { userId, status: 'OPEN' },
            });
            cashSessionId = activeSession?.id || null;
        }

        const sale = await prisma.$transaction(async (tx) => {
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
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Sale creation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSales = async (req: AuthRequest, res: Response) => {
    try {
        const { status, limit = '50', offset = '0', startDate, endDate } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
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
            prisma.sale.count({ where }),
        ]);

        res.json({ sales, total });
    } catch (error) {
        logger.error('Error fetching sales', error);
        res.status(500).json({ message: 'Error fetching sales' });
    }
};

export const getSale = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                user: { select: { name: true, role: true } },
                details: { include: { product: true, variant: true } },
                payments: true,
            },
        });
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sale' });
    }
};

export const voidSale = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ message: 'Void reason required' });

        const sale = await prisma.sale.findUnique({
            where: { id: Number(id) },
            include: { details: true },
        });

        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        if (sale.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Only completed sales can be voided' });
        }

        await prisma.$transaction(async (tx) => {
            // Void the sale
            await tx.sale.update({
                where: { id: Number(id) },
                data: { status: 'VOIDED', refundReason: reason },
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
    } catch (error) {
        logger.error('Error voiding sale', error);
        res.status(500).json({ message: 'Error voiding sale' });
    }
};

export const refundSale = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ message: 'Refund reason required' });

        const sale = await prisma.sale.findUnique({
            where: { id: Number(id) },
            include: { details: true },
        });

        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        if (sale.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Only completed sales can be refunded' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.sale.update({
                where: { id: Number(id) },
                data: { status: 'REFUNDED', refundReason: reason },
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
    } catch (error) {
        logger.error('Error refunding sale', error);
        res.status(500).json({ message: 'Error refunding sale' });
    }
};
