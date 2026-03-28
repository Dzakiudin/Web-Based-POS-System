import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const CustomerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional().nullable(),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
});

export const getCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const { search } = req.query;
        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { phone: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const customers = await prisma.customer.findMany({
            where,
            include: {
                _count: { select: { sales: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(customers);
    } catch (error) {
        logger.error('Error fetching customers', error);
        res.status(500).json({ message: 'Error fetching customers' });
    }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: Number(id) },
            include: {
                sales: {
                    take: 20,
                    orderBy: { date: 'desc' },
                    include: {
                        details: { include: { product: { select: { name: true } } } },
                        payments: true,
                    },
                },
                vouchers: { where: { isUsed: false, expiresAt: { gte: new Date() } } },
            },
        });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer' });
    }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const validated = CustomerSchema.parse(req.body);
        const customer = await prisma.customer.create({ data: validated });
        res.status(201).json(customer);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error creating customer', error);
        res.status(500).json({ message: 'Error creating customer' });
    }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validated = CustomerSchema.partial().parse(req.body);
        const customer = await prisma.customer.update({
            where: { id: Number(id) },
            data: validated,
        });
        res.json(customer);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error updating customer', error);
        res.status(500).json({ message: 'Error updating customer' });
    }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.customer.delete({ where: { id: Number(id) } });
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        logger.error('Error deleting customer', error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
};
