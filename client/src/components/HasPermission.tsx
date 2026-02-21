import React from 'react';
import { useAuth } from '../context/AuthContext';

interface HasPermissionProps {
    /**
     * A single permission string or an array of permissions.
     * If an array is provided, the user needs at least ONE of the permissions.
     */
    permission: string | string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const HasPermission: React.FC<HasPermissionProps> = ({ permission, children, fallback = null }) => {
    const { user } = useAuth();

    if (!user) {
        return fallback as React.ReactElement;
    }

    // OWNER bypasses all UI permission checks
    if (user.role === 'OWNER') {
        return children as React.ReactElement;
    }

    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = user.permissions || [];

    const hasAccess = requiredPermissions.some(p => userPermissions.includes(p));

    if (hasAccess) {
        return children as React.ReactElement;
    }

    return fallback as React.ReactElement;
};

export default HasPermission;
