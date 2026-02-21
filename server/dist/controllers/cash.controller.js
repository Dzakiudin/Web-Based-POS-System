"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveSession = exports.getSessions = exports.addMovement = exports.closeSession = exports.openSession = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const OpenSessionSchema = zod_1.z.object({
    openingBalance: zod_1.z.number().min(0),
    notes: zod_1.z.string().optional(),
});
const CashMovementSchema = zod_1.z.object({
    type: zod_1.z.enum(['CASH_IN', 'CASH_OUT']),
    amount: zod_1.z.number().positive(),
    reason: zod_1.z.string().min(1),
});
const CloseSessionSchema = zod_1.z.object({
    closingBalance: zod_1.z.number().min(0),
    notes: zod_1.z.string().optional(),
});
const openSession = async (req, res) => {
    try {
        const validated = OpenSessionSchema.parse(req.body);
        const userId = req.user.id;
        // Check if user already has an open session
        const existingSession = await database_1.default.cashSession.findFirst({
            where: { userId, status: 'OPEN' },
        });
        if (existingSession) {
            return res.status(400).json({ message: 'You already have an open cash session. Close it first.' });
        }
        const session = await database_1.default.cashSession.create({
            data: {
                userId,
                openingBalance: validated.openingBalance,
                notes: validated.notes,
            },
        });
        res.status(201).json(session);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error opening cash session', error);
        res.status(500).json({ message: 'Error opening cash session' });
    }
};
exports.openSession = openSession;
const closeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const validated = CloseSessionSchema.parse(req.body);
        const session = await database_1.default.cashSession.findUnique({
            where: { id: Number(id) },
            include: {
                movements: true,
                sales: { where: { status: 'COMPLETED' }, include: { payments: true } },
            },
        });
        if (!session)
            return res.status(404).json({ message: 'Session not found' });
        if (session.status !== 'OPEN')
            return res.status(400).json({ message: 'Session already closed' });
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
        const updatedSession = await database_1.default.cashSession.update({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error closing cash session', error);
        res.status(500).json({ message: 'Error closing cash session' });
    }
};
exports.closeSession = closeSession;
const addMovement = async (req, res) => {
    try {
        const { id } = req.params;
        const validated = CashMovementSchema.parse(req.body);
        const session = await database_1.default.cashSession.findUnique({ where: { id: Number(id) } });
        if (!session || session.status !== 'OPEN') {
            return res.status(400).json({ message: 'No open session found' });
        }
        const movement = await database_1.default.cashMovement.create({
            data: {
                sessionId: Number(id),
                type: validated.type,
                amount: validated.amount,
                reason: validated.reason,
            },
        });
        res.status(201).json(movement);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.issues });
        }
        logger_1.default.error('Error adding cash movement', error);
        res.status(500).json({ message: 'Error adding cash movement' });
    }
};
exports.addMovement = addMovement;
const getSessions = async (req, res) => {
    try {
        const sessions = await database_1.default.cashSession.findMany({
            include: {
                user: { select: { id: true, name: true, role: true } },
                _count: { select: { sales: true, movements: true } },
            },
            orderBy: { openedAt: 'desc' },
            take: 50,
        });
        res.json(sessions);
    }
    catch (error) {
        logger_1.default.error('Error fetching cash sessions', error);
        res.status(500).json({ message: 'Error fetching cash sessions' });
    }
};
exports.getSessions = getSessions;
const getActiveSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const session = await database_1.default.cashSession.findFirst({
            where: { userId, status: 'OPEN' },
            include: {
                user: { select: { id: true, name: true, role: true } },
                movements: { orderBy: { createdAt: 'desc' } },
                sales: {
                    where: { status: 'COMPLETED' },
                    include: { payments: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!session)
            return res.status(404).json({ message: 'No active session' });
        res.json(session);
    }
    catch (error) {
        logger_1.default.error('Error fetching active session', error);
        res.status(500).json({ message: 'Error fetching active session' });
    }
};
exports.getActiveSession = getActiveSession;
