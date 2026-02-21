import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const OpenSessionSchema = z.object({
    openingBalance: z.number().min(0),
    notes: z.string().optional(),
});

const CashMovementSchema = z.object({
    type: z.enum(['CASH_IN', 'CASH_OUT']),
    amount: z.number().positive(),
    reason: z.string().min(1),
});

const CloseSessionSchema = z.object({
    closingBalance: z.number().min(0),
    notes: z.string().optional(),
});

export const openSession = async (req: AuthRequest, res: Response) => {
    try {
        const validated = OpenSessionSchema.parse(req.body);
        const userId = req.user!.id;

        // Check if user already has an open session
        const existingSession = await prisma.cashSession.findFirst({
            where: { userId, status: 'OPEN' },
        });
        if (existingSession) {
            return res.status(400).json({ message: 'You already have an open cash session. Close it first.' });
        }

        const session = await prisma.cashSession.create({
            data: {
                userId,
                openingBalance: validated.openingBalance,
                notes: validated.notes,
            },
        });
        res.status(201).json(session);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error opening cash session', error);
        res.status(500).json({ message: 'Error opening cash session' });
    }
};

export const closeSession = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validated = CloseSessionSchema.parse(req.body);

        const session = await prisma.cashSession.findUnique({
            where: { id: Number(id) },
            include: {
                movements: true,
                sales: { where: { status: 'COMPLETED' }, include: { payments: true } },
            },
        });

        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.status !== 'OPEN') return res.status(400).json({ message: 'Session already closed' });

        // Calculate expected balance
        const cashSales = session.sales.reduce((total, sale) => {
            const cashPayments = sale.payments
                .filter(p => p.method === 'CASH')
                .reduce((sum, p) => sum + Number(p.amount) - Number(p.change), 0);
            return total + cashPayments;
        }, 0);

        const cashIn = session.movements
            .filter(m => m.type === 'CASH_IN')
            .reduce((sum, m) => sum + Number(m.amount), 0);

        const cashOut = session.movements
            .filter(m => m.type === 'CASH_OUT')
            .reduce((sum, m) => sum + Number(m.amount), 0);

        const expectedBalance = Number(session.openingBalance) + cashSales + cashIn - cashOut;
        const difference = validated.closingBalance - expectedBalance;

        const updatedSession = await prisma.cashSession.update({
            where: { id: Number(id) },
            data: {
                closingBalance: validated.closingBalance,
                expectedBalance,
                difference,
                status: 'CLOSED',
                notes: validated.notes,
                closedAt: new Date(),
            },
        });

        res.json(updatedSession);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error closing cash session', error);
        res.status(500).json({ message: 'Error closing cash session' });
    }
};

export const addMovement = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validated = CashMovementSchema.parse(req.body);

        const session = await prisma.cashSession.findUnique({ where: { id: Number(id) } });
        if (!session || session.status !== 'OPEN') {
            return res.status(400).json({ message: 'No open session found' });
        }

        const movement = await prisma.cashMovement.create({
            data: {
                sessionId: Number(id),
                type: validated.type,
                amount: validated.amount,
                reason: validated.reason,
            },
        });
        res.status(201).json(movement);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger.error('Error adding cash movement', error);
        res.status(500).json({ message: 'Error adding cash movement' });
    }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await prisma.cashSession.findMany({
            include: {
                user: { select: { id: true, name: true, role: true } },
                _count: { select: { sales: true, movements: true } },
            },
            orderBy: { openedAt: 'desc' },
            take: 50,
        });
        res.json(sessions);
    } catch (error) {
        logger.error('Error fetching cash sessions', error);
        res.status(500).json({ message: 'Error fetching cash sessions' });
    }
};

export const getActiveSession = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const session = await prisma.cashSession.findFirst({
            where: { userId, status: 'OPEN' },
            include: {
                movements: { orderBy: { createdAt: 'desc' } },
                sales: {
                    where: { status: 'COMPLETED' },
                    include: { payments: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!session) return res.status(404).json({ message: 'No active session' });
        res.json(session);
    } catch (error) {
        logger.error('Error fetching active session', error);
        res.status(500).json({ message: 'Error fetching active session' });
    }
};
