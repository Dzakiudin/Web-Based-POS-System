"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const getAuditLogs = async (req, res) => {
    try {
        const { userId, action, entity, limit = '100', offset = '0' } = req.query;
        const where = {};
        if (userId)
            where.userId = Number(userId);
        if (action)
            where.action = { contains: action };
        if (entity)
            where.entity = entity;
        const [logs, total] = await Promise.all([
            database_1.default.auditLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            database_1.default.auditLog.count({ where }),
        ]);
        const formattedLogs = logs.map(log => ({
            ...log,
            user: log.user ? {
                id: log.user.id,
                name: log.user.name,
                role: log.user.role?.name || 'KASIR',
            } : null
        }));
        res.json({ logs: formattedLogs, total, limit: Number(limit), offset: Number(offset) });
    }
    catch (error) {
        logger_1.default.error('Error fetching audit logs', error);
        res.status(500).json({ message: 'Error fetching audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
