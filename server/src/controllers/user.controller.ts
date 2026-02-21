import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const UserCreateSchema = z.object({
    name: z.string().min(1),
    username: z.string().min(3),
    password: z.string().min(6),
    pin: z.string().length(4).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.enum(['OWNER', 'ADMIN', 'CASHIER']),
});

const UserUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.enum(['OWNER', 'ADMIN', 'CASHIER']).optional(),
    pin: z.string().length(4).optional(),
    isActive: z.boolean().optional(),
});

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
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
        res.json(users);
    } catch (error) {
        logger.error('Error fetching users', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const getUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
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
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const validated = UserCreateSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { username: validated.username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(validated.password, 10);
        const hashedPin = validated.pin ? await bcrypt.hash(validated.pin, 10) : null;

        const user = await prisma.user.create({
            data: {
                name: validated.name,
                username: validated.username,
                password: hashedPassword,
                pin: hashedPin,
                email: validated.email,
                phone: validated.phone,
                role: validated.role,
            },
            select: { id: true, name: true, username: true, role: true },
        });

        res.status(201).json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error creating user', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validated = UserUpdateSchema.parse(req.body);

        const data: any = { ...validated };
        if (validated.pin) {
            data.pin = await bcrypt.hash(validated.pin, 10);
        }

        const user = await prisma.user.update({
            where: { id: Number(id) },
            data,
            select: { id: true, name: true, username: true, role: true, isActive: true },
        });
        res.json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error updating user', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Soft delete - deactivate user
        await prisma.user.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });
        res.json({ message: 'User deactivated' });
    } catch (error) {
        logger.error('Error deleting user', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: Number(id) },
            data: { password: hashedPassword },
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        logger.error('Error resetting password', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};
