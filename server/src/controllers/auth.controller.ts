import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, username, password, role } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const inputRole = role || 'KASIR';
        const roleRecord = await prisma.role.findUnique({ where: { name: inputRole } });

        const user = await prisma.user.create({
            data: {
                name,
                username,
                password: hashedPassword,
                roleId: roleRecord?.id || 1,
            },
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        logger.error('Registration error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findUnique({
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

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const roleName = user.role?.name || 'KASIR';
        const permissions = user.role?.permissions.map((rp: any) => rp.permission.name) || [];

        const token = jwt.sign(
            { id: user.id, username: user.username, role: roleName, permissions },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' }
        );

        // Log audit
        await prisma.auditLog.create({
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
    } catch (error) {
        logger.error('Login error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
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
        if (!user) return res.status(404).json({ message: 'User not found' });

        const formattedUser = {
            ...user,
            role: user.role?.name || 'KASIR',
            permissions: user.role?.permissions.map((rp: any) => rp.permission.name) || []
        };
        res.json(formattedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
};
