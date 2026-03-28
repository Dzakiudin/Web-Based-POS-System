import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const CategorySchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
});

export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    } catch (error) {
        logger.error('Error fetching categories', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

export const getCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: Number(id) },
            include: { products: true },
        });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category' });
    }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const validated = CategorySchema.parse(req.body);
        const category = await prisma.category.create({ data: validated });
        res.status(201).json(category);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error creating category', error);
        res.status(500).json({ message: 'Error creating category' });
    }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validated = CategorySchema.partial().parse(req.body);
        const category = await prisma.category.update({
            where: { id: Number(id) },
            data: validated,
        });
        res.json(category);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error updating category', error);
        res.status(500).json({ message: 'Error updating category' });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.category.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'Category deactivated' });
    } catch (error) {
        logger.error('Error deleting category', error);
        res.status(500).json({ message: 'Error deleting category' });
    }
};
