import { Response } from 'express';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, action, entity, limit = '100', offset = '0' } = req.query;

        const where: any = {};
        if (userId) where.userId = Number(userId);
        if (action) where.action = { contains: action as string };
        if (entity) where.entity = entity;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({ logs, total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
        logger.error('Error fetching audit logs', error);
        res.status(500).json({ message: 'Error fetching audit logs' });
    }
};
