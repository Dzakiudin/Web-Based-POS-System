import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const voucherSchema = z.object({
    code: z.string().min(3).max(30),
    customerId: z.number().optional().nullable(),
    discountId: z.number().optional().nullable(),
    expiresAt: z.string().datetime().or(z.string()),
});

// Get all vouchers
export const getVouchers = async (req: Request, res: Response) => {
    try {
        const { status, customerId } = req.query;
        const where: any = {};

        if (status === 'active') {
            where.isUsed = false;
            where.expiresAt = { gt: new Date() };
        } else if (status === 'used') {
            where.isUsed = true;
        } else if (status === 'expired') {
            where.isUsed = false;
            where.expiresAt = { lte: new Date() };
        }

        if (customerId) where.customerId = Number(customerId);

        const vouchers = await prisma.voucher.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true } },
                discount: { select: { id: true, name: true, type: true, value: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch vouchers', error });
    }
};

// Create voucher
export const createVoucher = async (req: AuthRequest, res: Response) => {
    try {
        const data = voucherSchema.parse(req.body);
        const existing = await prisma.voucher.findUnique({ where: { code: data.code } });
        if (existing) return res.status(400).json({ message: 'Kode voucher sudah ada' });

        const voucher = await prisma.voucher.create({
            data: {
                code: data.code.toUpperCase(),
                customerId: data.customerId || null,
                discountId: data.discountId || null,
                expiresAt: new Date(data.expiresAt),
            },
            include: {
                customer: { select: { id: true, name: true } },
                discount: { select: { id: true, name: true, type: true, value: true } },
            },
        });
        res.status(201).json(voucher);
    } catch (error) {
        res.status(400).json({ message: 'Validation error', error });
    }
};

// Delete voucher
export const deleteVoucher = async (req: AuthRequest, res: Response) => {
    try {
        await prisma.voucher.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Voucher deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete voucher', error });
    }
};

// Validate voucher code
export const validateVoucher = async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const voucher = await prisma.voucher.findUnique({
            where: { code: code.toUpperCase() },
            include: { discount: true, customer: { select: { id: true, name: true } } },
        });

        if (!voucher) return res.status(404).json({ message: 'Voucher tidak ditemukan' });
        if (voucher.isUsed) return res.status(400).json({ message: 'Voucher sudah digunakan' });
        if (new Date() > voucher.expiresAt) return res.status(400).json({ message: 'Voucher sudah kedaluwarsa' });

        res.json(voucher);
    } catch (error) {
        res.status(500).json({ message: 'Validation failed', error });
    }
};

// Mark voucher as used
export const useVoucher = async (req: AuthRequest, res: Response) => {
    try {
        const voucher = await prisma.voucher.update({
            where: { id: Number(req.params.id) },
            data: { isUsed: true, usedAt: new Date() },
        });
        res.json(voucher);
    } catch (error) {
        res.status(500).json({ message: 'Failed to use voucher', error });
    }
};
