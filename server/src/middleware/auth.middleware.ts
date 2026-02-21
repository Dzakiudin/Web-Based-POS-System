import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
        permissions: string[];
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = verified as AuthRequest['user'];
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid token.' });
    }
};

/**
 * Role-Based Access Control middleware using strict permissions.
 * Usage: router.post('/', authenticateToken, requirePermission('product.create'), handler)
 */
export const requirePermission = (...requiredPermissions: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }

        // OWNER bypasses all permission checks
        if (req.user.role === 'OWNER') {
            return next();
        }

        if (!req.user.permissions) {
            return res.status(403).json({ message: `Insufficient permissions.` });
        }

        const hasPermission = requiredPermissions.some(perm => req.user!.permissions.includes(perm));

        if (!hasPermission) {
            return res.status(403).json({ message: `Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}` });
        }
        next();
    };
};
