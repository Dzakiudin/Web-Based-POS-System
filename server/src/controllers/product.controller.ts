import { Request, Response } from 'express';
import prisma from '../utils/database';
import logger from '../utils/logger';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(products);
    } catch (error) {
        logger.error('Error fetching products', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
        });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, price, stock } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const product = await prisma.product.create({
            data: {
                name,
                price,
                stock: Number(stock),
                image,
            },
        });
        res.status(201).json(product);
    } catch (error) {
        logger.error('Error creating product', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, price, stock } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : undefined;

        const data: any = {
            name,
            price,
            stock: Number(stock),
        };

        if (image) {
            data.image = image;
        }

        const product = await prisma.product.update({
            where: { id: Number(id) },
            data,
        });
        res.json(product);
    } catch (error) {
        logger.error('Error updating product', error);
        res.status(500).json({ message: 'Error updating product' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        logger.error('Error deleting product', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};
