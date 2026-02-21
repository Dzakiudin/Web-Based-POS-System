import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const StockMovementSchema = z.object({
    productId: z.number().int().positive(),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.number().int().positive(),
    reason: z.string().optional(),
    reference: z.string().optional(),
});

export const getStockMovements = async (req: AuthRequest, res: Response) => {
    try {
        const { productId, type, limit = '50' } = req.query;

        const where: any = {};
        if (productId) where.productId = Number(productId);
        if (type) where.type = type;

        const movements = await prisma.stockMovement.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
        });
        res.json(movements);
    } catch (error) {
        logger.error('Error fetching stock movements', error);
        res.status(500).json({ message: 'Error fetching stock movements' });
    }
};

export const createStockMovement = async (req: AuthRequest, res: Response) => {
    try {
        const validated = StockMovementSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await prisma.$transaction(async (tx) => {
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
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error creating stock movement', error);
        res.status(500).json({ message: 'Error creating stock movement' });
    }
};

export const getLowStockProducts = async (req: AuthRequest, res: Response) => {
    try {
        const products = await prisma.product.findMany({
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
    } catch (error) {
        logger.error('Error fetching low stock products', error);
        res.status(500).json({ message: 'Error fetching low stock products' });
    }
};
