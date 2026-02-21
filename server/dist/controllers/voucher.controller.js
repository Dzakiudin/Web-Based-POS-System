"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVoucher = exports.validateVoucher = exports.deleteVoucher = exports.createVoucher = exports.getVouchers = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const voucherSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(30),
    customerId: zod_1.z.number().optional().nullable(),
    discountId: zod_1.z.number().optional().nullable(),
    expiresAt: zod_1.z.string().datetime().or(zod_1.z.string()),
});
// Get all vouchers
const getVouchers = async (req, res) => {
    try {
        const { status, customerId } = req.query;
        const where = {};
        if (status === 'active') {
            where.isUsed = false;
            where.expiresAt = { gt: new Date() };
        }
        else if (status === 'used') {
            where.isUsed = true;
        }
        else if (status === 'expired') {
            where.isUsed = false;
            where.expiresAt = { lte: new Date() };
        }
        if (customerId)
            where.customerId = Number(customerId);
        const vouchers = await prisma.voucher.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true } },
                discount: { select: { id: true, name: true, type: true, value: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(vouchers);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch vouchers', error });
    }
};
exports.getVouchers = getVouchers;
// Create voucher
const createVoucher = async (req, res) => {
    try {
        const data = voucherSchema.parse(req.body);
        const existing = await prisma.voucher.findUnique({ where: { code: data.code } });
        if (existing)
            return res.status(400).json({ message: 'Kode voucher sudah ada' });
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
    }
    catch (error) {
        res.status(400).json({ message: 'Validation error', error });
    }
};
exports.createVoucher = createVoucher;
// Delete voucher
const deleteVoucher = async (req, res) => {
    try {
        await prisma.voucher.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Voucher deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete voucher', error });
    }
};
exports.deleteVoucher = deleteVoucher;
// Validate voucher code
const validateVoucher = async (req, res) => {
    try {
        const code = req.params.code;
        const voucher = await prisma.voucher.findUnique({
            where: { code: code.toUpperCase() },
            include: { discount: true, customer: { select: { id: true, name: true } } },
        });
        if (!voucher)
            return res.status(404).json({ message: 'Voucher tidak ditemukan' });
        if (voucher.isUsed)
            return res.status(400).json({ message: 'Voucher sudah digunakan' });
        if (new Date() > voucher.expiresAt)
            return res.status(400).json({ message: 'Voucher sudah kedaluwarsa' });
        res.json(voucher);
    }
    catch (error) {
        res.status(500).json({ message: 'Validation failed', error });
    }
};
exports.validateVoucher = validateVoucher;
// Mark voucher as used
const useVoucher = async (req, res) => {
    try {
        const voucher = await prisma.voucher.update({
            where: { id: Number(req.params.id) },
            data: { isUsed: true, usedAt: new Date() },
        });
        res.json(voucher);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to use voucher', error });
    }
};
exports.useVoucher = useVoucher;
