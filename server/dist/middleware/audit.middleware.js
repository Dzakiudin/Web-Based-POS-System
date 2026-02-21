"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditAction = void 0;
const database_1 = __importDefault(require("../utils/database"));
/**
 * Middleware factory to automatically log important actions to the audit_logs table.
 * Usage: router.post('/products', authenticateToken, auditAction('CREATE_PRODUCT', 'Product'), handler)
 */
const auditAction = (action, entity) => {
    return async (req, res, next) => {
        // Store original json method to intercept the response
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            // Only log if the response was successful (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entityId = body?.id || req.params?.id ? Number(req.params?.id) : null;
                database_1.default.auditLog.create({
                    data: {
                        userId: req.user?.id || null,
                        action,
                        entity,
                        entityId,
                        details: JSON.stringify({
                            method: req.method,
                            path: req.originalUrl,
                            body: req.method !== 'GET' ? req.body : undefined,
                        }),
                        ip: req.ip || req.socket.remoteAddress || null,
                    },
                }).catch((err) => {
                    console.error('Audit log error:', err);
                });
            }
            return originalJson(body);
        };
        next();
    };
};
exports.auditAction = auditAction;
