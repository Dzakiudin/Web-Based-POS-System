import { Request, Response } from 'express';
import prisma from '../utils/database';
import logger from '../utils/logger';

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(customers);
    } catch (error) {
        logger.error('Error fetching customers', error);
        res.status(500).json({ message: 'Error fetching customers' });
    }
};

export const getCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: Number(id) },
        });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer' });
    }
};

export const createCustomer = async (req: Request, res: Response) => {
    try {
        const { name, address, phone } = req.body;
        const customer = await prisma.customer.create({
            data: {
                name,
                address,
                phone,
            },
        });
        res.status(201).json(customer);
    } catch (error) {
        logger.error('Error creating customer', error);
        res.status(500).json({ message: 'Error creating customer' });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, address, phone } = req.body;
        const customer = await prisma.customer.update({
            where: { id: Number(id) },
            data: {
                name,
                address,
                phone,
            },
        });
        res.json(customer);
    } catch (error) {
        logger.error('Error updating customer', error);
        res.status(500).json({ message: 'Error updating customer' });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.customer.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        logger.error('Error deleting customer', error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
};
