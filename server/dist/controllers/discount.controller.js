"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePromoCode = exports.deleteDiscount = exports.updateDiscount = exports.createDiscount = exports.getDiscounts = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const DiscountSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(['PERCENTAGE', 'FIXED']),
    value: zod_1.z.number().positive(),
    minPurchase: zod_1.z.number().optional(),
    code: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    maxUses: zod_1.z.number().int().positive().optional(),
    isActive: zod_1.z.boolean().optional(),
});
const getDiscounts = async (req, res) => {
    try {
        const discounts = await database_1.default.discount.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(discounts);
    }
    catch (error) {
        logger_1.default.error('Error fetching discounts', error);
        res.status(500).json({ message: 'Error fetching discounts' });
    }
};
exports.getDiscounts = getDiscounts;
const createDiscount = async (req, res) => {
    try {
        const validated = DiscountSchema.parse(req.body);
        const discount = await database_1.default.discount.create({
            data: {
                ...validated,
                startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
            },
        });
        res.status(201).json(discount);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error creating discount', error);
        res.status(500).json({ message: 'Error creating discount' });
    }
};
exports.createDiscount = createDiscount;
const updateDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const validated = DiscountSchema.partial().parse(req.body);
        const discount = await database_1.default.discount.update({
            where: { id: Number(id) },
            data: {
                ...validated,
                startDate: validated.startDate ? new Date(validated.startDate) : undefined,
                endDate: validated.endDate ? new Date(validated.endDate) : undefined,
            },
        });
        res.json(discount);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error updating discount', error);
        res.status(500).json({ message: 'Error updating discount' });
    }
};
exports.updateDiscount = updateDiscount;
const deleteDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.discount.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'Discount deactivated' });
    }
    catch (error) {
        logger_1.default.error('Error deleting discount', error);
        res.status(500).json({ message: 'Error deleting discount' });
    }
};
exports.deleteDiscount = deleteDiscount;
const validatePromoCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ message: 'Promo code required' });
        const discount = await database_1.default.discount.findUnique({ where: { code } });
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
    }
    catch (error) {
        logger_1.default.error('Error validating promo code', error);
        res.status(500).json({ message: 'Error validating promo code' });
    }
};
exports.validatePromoCode = validatePromoCode;
