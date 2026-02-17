"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const getProducts = async (req, res) => {
    try {
        const products = await database_1.default.product.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(products);
    }
    catch (error) {
        logger_1.default.error('Error fetching products', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await database_1.default.product.findUnique({
            where: { id: Number(id) },
        });
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};
exports.getProduct = getProduct;
const createProduct = async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const product = await database_1.default.product.create({
            data: {
                name,
                price,
                stock: Number(stock),
                image,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        logger_1.default.error('Error creating product', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : undefined;
        const data = {
            name,
            price,
            stock: Number(stock),
        };
        if (image) {
            data.image = image;
        }
        const product = await database_1.default.product.update({
            where: { id: Number(id) },
            data,
        });
        res.json(product);
    }
    catch (error) {
        logger_1.default.error('Error updating product', error);
        res.status(500).json({ message: 'Error updating product' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.product.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'Product deleted' });
    }
    catch (error) {
        logger_1.default.error('Error deleting product', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};
exports.deleteProduct = deleteProduct;
