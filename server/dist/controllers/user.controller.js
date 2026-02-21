"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUser = exports.getUsers = void 0;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const UserCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(6),
    pin: zod_1.z.string().length(4).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum(['OWNER', 'ADMIN', 'CASHIER']),
});
const UserUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum(['OWNER', 'ADMIN', 'CASHIER']).optional(),
    pin: zod_1.z.string().length(4).optional(),
    isActive: zod_1.z.boolean().optional(),
});
const getUsers = async (req, res) => {
    try {
        const users = await database_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: { select: { sales: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(users.map(u => ({ ...u, role: u.role?.name || 'KASIR' })));
    }
    catch (error) {
        logger_1.default.error('Error fetching users', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};
exports.getUsers = getUsers;
const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await database_1.default.user.findUnique({
            where: { id: Number(id) },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: { select: { sales: true, cashSessions: true } },
            },
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json({ ...user, role: user.role?.name || 'KASIR' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
};
exports.getUser = getUser;
const createUser = async (req, res) => {
    try {
        const validated = UserCreateSchema.parse(req.body);
        const existingUser = await database_1.default.user.findUnique({ where: { username: validated.username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(validated.password, 10);
        const hashedPin = validated.pin ? await bcryptjs_1.default.hash(validated.pin, 10) : null;
        const inputRole = validated.role || 'CASHIER';
        const roleRecord = await database_1.default.role.findUnique({ where: { name: inputRole === 'CASHIER' ? 'KASIR' : inputRole } });
        const user = await database_1.default.user.create({
            data: {
                name: validated.name,
                username: validated.username,
                password: hashedPassword,
                pin: hashedPin,
                email: validated.email,
                phone: validated.phone,
                roleId: roleRecord?.id || 1,
            },
            include: { role: true },
        });
        const formattedUser = {
            id: user.id, name: user.name, username: user.username, role: user.role?.name || 'KASIR'
        };
        res.status(201).json(formattedUser);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error creating user', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const validated = UserUpdateSchema.parse(req.body);
        const data = { ...validated };
        if (validated.pin) {
            data.pin = await bcryptjs_1.default.hash(validated.pin, 10);
        }
        const existing = await database_1.default.user.findUnique({ where: { id: Number(id) }, include: { role: true } });
        if (validated.role) {
            const inputRole = validated.role === 'CASHIER' ? 'KASIR' : validated.role;
            const roleRecord = await database_1.default.role.findUnique({ where: { name: inputRole } });
            if (roleRecord)
                data.roleId = roleRecord.id;
            delete data.role;
        }
        const user = await database_1.default.user.update({
            where: { id: Number(id) },
            data,
            include: { role: true },
        });
        const formattedUser = {
            id: user.id, name: user.name, username: user.username, role: user.role?.name || 'KASIR', isActive: user.isActive
        };
        if (existing && validated.role) {
            const oldRoleName = existing.role?.name || 'KASIR';
            const newRoleName = user.role?.name || 'KASIR';
            if (oldRoleName !== newRoleName) {
                await database_1.default.auditLog.create({
                    data: {
                        userId: req.user?.id,
                        action: 'UPDATE_ROLE',
                        entity: 'User',
                        entityId: user.id,
                        details: JSON.stringify({ oldRole: oldRoleName, newRole: newRoleName }),
                        ip: req.ip || req.socket.remoteAddress || null,
                    }
                }).catch(() => { });
            }
        }
        res.json(formattedUser);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error updating user', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete - deactivate user
        await database_1.default.user.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'User deactivated' });
    }
    catch (error) {
        logger_1.default.error('Error deleting user', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};
exports.deleteUser = deleteUser;
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await database_1.default.user.update({
            where: { id: Number(id) },
            data: { password: hashedPassword },
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        logger_1.default.error('Error resetting password', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};
exports.resetPassword = resetPassword;
