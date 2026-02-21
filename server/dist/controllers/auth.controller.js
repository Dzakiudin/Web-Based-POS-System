"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const register = async (req, res) => {
    try {
        const { name, username, password, role } = req.body;
        const existingUser = await database_1.default.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const inputRole = role || 'KASIR';
        const roleRecord = await database_1.default.role.findUnique({ where: { name: inputRole } });
        const user = await database_1.default.user.create({
            data: {
                name,
                username,
                password: hashedPassword,
                roleId: roleRecord?.id || 1,
            },
        });
        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    }
    catch (error) {
        logger_1.default.error('Registration error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await database_1.default.user.findUnique({
            where: { username },
            include: {
                role: {
                    include: {
                        permissions: { include: { permission: true } }
                    }
                }
            }
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const roleName = user.role?.name || 'KASIR';
        const permissions = user.role?.permissions.map((rp) => rp.permission.name) || [];
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: roleName, permissions }, process.env.JWT_SECRET, { expiresIn: '1d' });
        // Log audit
        await database_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                entity: 'User',
                entityId: user.id,
                ip: req.ip || req.socket.remoteAddress || null,
            },
        }).catch(() => { }); // Non-blocking
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: roleName,
                username: user.username,
                permissions
            }
        });
    }
    catch (error) {
        logger_1.default.error('Login error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
                role: { select: { name: true, permissions: { include: { permission: true } } } },
                isActive: true,
                createdAt: true,
            },
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const formattedUser = {
            ...user,
            role: user.role?.name || 'KASIR',
            permissions: user.role?.permissions.map((rp) => rp.permission.name) || []
        };
        res.json(formattedUser);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
};
exports.getProfile = getProfile;
