"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSale = exports.getSales = exports.createSale = void 0;
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const createSale = async (req, res) => {
    try {
        const { customerId, details, totalPrice } = req.body; // details: [{ productId, quantity, subtotal }]
        // Start a transaction
        const result = await database_1.default.$transaction(async (prisma) => {
            // 1. Create the Sale record
            const sale = await prisma.sale.create({
                data: {
                    customerId: customerId ? Number(customerId) : null,
                    totalPrice,
                    details: {
                        create: details.map((detail) => ({
                            productId: Number(detail.productId),
                            quantity: Number(detail.quantity),
                            subtotal: detail.subtotal,
                        })),
                    },
                },
                include: { details: true },
            });
            // 2. Update Product Stock
            for (const detail of details) {
                await prisma.product.update({
                    where: { id: Number(detail.productId) },
                    data: {
                        stock: {
                            decrement: Number(detail.quantity),
                        },
                    },
                });
            }
            return sale;
        });
        res.status(201).json(result);
    }
    catch (error) {
        logger_1.default.error('Error processing sale', error);
        res.status(500).json({ message: 'Error processing sale' });
    }
};
exports.createSale = createSale;
const getSales = async (req, res) => {
    try {
        const sales = await database_1.default.sale.findMany({
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
    }
    catch (error) {
        logger_1.default.error('Error fetching sales', error);
        res.status(500).json({ message: 'Error fetching sales' });
    }
};
exports.getSales = getSales;
const getSale = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await database_1.default.sale.findUnique({
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
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sale' });
    }
};
exports.getSale = getSale;
