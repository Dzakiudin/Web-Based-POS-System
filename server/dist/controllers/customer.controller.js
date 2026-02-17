"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomer = exports.getCustomers = void 0;
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const getCustomers = async (req, res) => {
    try {
        const customers = await database_1.default.customer.findMany({
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
        const { name, address, phone } = req.body;
        const customer = await database_1.default.customer.create({
            data: {
                name,
                address,
                phone,
            },
        });
        res.status(201).json(customer);
    }
    catch (error) {
        logger_1.default.error('Error creating customer', error);
        res.status(500).json({ message: 'Error creating customer' });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone } = req.body;
        const customer = await database_1.default.customer.update({
            where: { id: Number(id) },
            data: {
                name,
                address,
                phone,
            },
        });
        res.json(customer);
    }
    catch (error) {
        logger_1.default.error('Error updating customer', error);
        res.status(500).json({ message: 'Error updating customer' });
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.customer.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'Customer deleted' });
    }
    catch (error) {
        logger_1.default.error('Error deleting customer', error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
};
exports.deleteCustomer = deleteCustomer;
