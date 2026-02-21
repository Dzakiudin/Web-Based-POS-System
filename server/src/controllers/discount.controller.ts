import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const DiscountSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().positive(),
    minPurchase: z.number().optional(),
    code: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    maxUses: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
});

export const getDiscounts = async (req: AuthRequest, res: Response) => {
    try {
        const discounts = await prisma.discount.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(discounts);
    } catch (error) {
        logger.error('Error fetching discounts', error);
        res.status(500).json({ message: 'Error fetching discounts' });
    }
};

export const createDiscount = async (req: AuthRequest, res: Response) => {
    try {
        const validated = DiscountSchema.parse(req.body);
        const discount = await prisma.discount.create({
            data: {
                ...validated,
                startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
            },
        });
        res.status(201).json(discount);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error creating discount', error);
        res.status(500).json({ message: 'Error creating discount' });
    }
};

export const updateDiscount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validated = DiscountSchema.partial().parse(req.body);
        const discount = await prisma.discount.update({
            where: { id: Number(id) },
            data: {
                ...validated,
                startDate: validated.startDate ? new Date(validated.startDate) : undefined,
                endDate: validated.endDate ? new Date(validated.endDate) : undefined,
            },
        });
        res.json(discount);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error updating discount', error);
        res.status(500).json({ message: 'Error updating discount' });
    }
};

export const deleteDiscount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.discount.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'Discount deactivated' });
    } catch (error) {
        logger.error('Error deleting discount', error);
        res.status(500).json({ message: 'Error deleting discount' });
    }
};

export const validatePromoCode = async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Promo code required' });

        const discount = await prisma.discount.findUnique({ where: { code } });

        if (!discount || !discount.isActive) {
            return res.status(404).json({ message: 'Invalid promo code' });
        }
        if (discount.endDate && new Date() > discount.endDate) {
            return res.status(400).json({ message: 'Promo code expired' });
        }
        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
            return res.status(400).json({ message: 'Promo code usage limit reached' });
        }

        res.json(discount);
    } catch (error) {
        logger.error('Error validating promo code', error);
        res.status(500).json({ message: 'Error validating promo code' });
    }
};
