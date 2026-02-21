"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomer = exports.getCustomers = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const CustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
});
const getCustomers = async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const customers = await database_1.default.customer.findMany({
            where,
            include: {
                _count: { select: { sales: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(customers);
    }
    catch (error) {
        logger_1.default.error('Error fetching customers', error);
        res.status(500).json({ message: 'Error fetching customers' });
    }
};
exports.getCustomers = getCustomers;
const getCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await database_1.default.customer.findUnique({
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
        if (!customer)
            return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching customer' });
    }
};
exports.getCustomer = getCustomer;
const createCustomer = async (req, res) => {
    try {
        const validated = CustomerSchema.parse(req.body);
        const customer = await database_1.default.customer.create({ data: validated });
        res.status(201).json(customer);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error creating customer', error);
        res.status(500).json({ message: 'Error creating customer' });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const validated = CustomerSchema.partial().parse(req.body);
        const customer = await database_1.default.customer.update({
            where: { id: Number(id) },
            data: validated,
        });
        res.json(customer);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error updating customer', error);
        res.status(500).json({ message: 'Error updating customer' });
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.customer.delete({ where: { id: Number(id) } });
        res.json({ message: 'Customer deleted' });
    }
    catch (error) {
        logger_1.default.error('Error deleting customer', error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
};
exports.deleteCustomer = deleteCustomer;
