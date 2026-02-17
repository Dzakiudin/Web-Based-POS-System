import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';

const SaleSchema = z.object({
    customerId: z.number().nullable().optional(),
    totalPrice: z.number().positive(),
    details: z.array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        subtotal: z.number().positive(),
    })).min(1),
});

export const createSale = async (req: Request, res: Response) => {
    try {
        const validatedBody = SaleSchema.parse(req.body);
        const { customerId, details, totalPrice } = validatedBody;

        // Use Prisma transaction to ensure atomic operations
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the Sale record
            const sale = await tx.sale.create({
                data: {
                    customerId: customerId ? Number(customerId) : null,
                    totalPrice,
                    details: {
                        create: details.map((detail) => ({
                            productId: detail.productId,
                            quantity: detail.quantity,
                            subtotal: detail.subtotal,
                        })),
                    },
                },
                include: { details: true },
            });

            // 2. Update Product Stock (Atomic decrement)
            for (const detail of details) {
                await tx.product.update({
                    where: { id: detail.productId },
                    data: {
                        stock: {
                            decrement: detail.quantity,
                        },
                    },
                });
            }

            return sale;
        });

        res.status(201).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error processing sale', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const getSales = async (req: Request, res: Response) => {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                customer: true,
                details: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
        res.json(sales);
    } catch (error) {
        logger.error('Error fetching sales', error);
        res.status(500).json({ message: 'Error fetching sales' });
    }
};

export const getSale = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                details: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sale' });
    }
};
