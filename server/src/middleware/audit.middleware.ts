import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../utils/database';

/**
 * Middleware factory to automatically log important actions to the audit_logs table.
 * Usage: router.post('/products', authenticateToken, auditAction('CREATE_PRODUCT', 'Product'), handler)
 */
export const auditAction = (action: string, entity: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Store original json method to intercept the response
        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            // Only log if the response was successful (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entityId = body?.id || req.params?.id ? Number(req.params?.id) : null;

                prisma.auditLog.create({
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
