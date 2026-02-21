"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategory = exports.getCategories = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const CategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
});
const getCategories = async (req, res) => {
    try {
        const categories = await database_1.default.category.findMany({
            where: { isActive: true },
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    }
    catch (error) {
        logger_1.default.error('Error fetching categories', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};
exports.getCategories = getCategories;
const getCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await database_1.default.category.findUnique({
            where: { id: Number(id) },
            include: { products: true },
        });
        if (!category)
            return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching category' });
    }
};
exports.getCategory = getCategory;
const createCategory = async (req, res) => {
    try {
        const validated = CategorySchema.parse(req.body);
        const category = await database_1.default.category.create({ data: validated });
        res.status(201).json(category);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error creating category', error);
        res.status(500).json({ message: 'Error creating category' });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const validated = CategorySchema.partial().parse(req.body);
        const category = await database_1.default.category.update({
            where: { id: Number(id) },
            data: validated,
        });
        res.json(category);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error updating category', error);
        res.status(500).json({ message: 'Error updating category' });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.category.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'Category deactivated' });
    }
    catch (error) {
        logger_1.default.error('Error deleting category', error);
        res.status(500).json({ message: 'Error deleting category' });
    }
};
exports.deleteCategory = deleteCategory;
