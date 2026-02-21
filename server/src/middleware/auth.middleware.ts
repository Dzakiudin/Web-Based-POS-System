import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
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
 * Role-Based Access Control middleware.
 * Usage: router.get('/admin-only', authenticateToken, authorizeRole('ADMIN', 'OWNER'), handler)
 */
export const authorizeRole = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions.' });
        }
        next();
    };
};
