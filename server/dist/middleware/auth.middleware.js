"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    try {
        const verified = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    }
    catch (err) {
        res.status(403).json({ message: 'Invalid token.' });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Role-Based Access Control middleware using strict permissions.
 * Usage: router.post('/', authenticateToken, requirePermission('product.create'), handler)
 */
const requirePermission = (...requiredPermissions) => {
    return (req, res, next) => {
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
        const hasPermission = requiredPermissions.some(perm => req.user.permissions.includes(perm));
        if (!hasPermission) {
            return res.status(403).json({ message: `Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}` });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
