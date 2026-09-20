import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { hasAnyPermission } from '../utils/permissions';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles?: string[];
  permissions?: string[];
  fallback?: ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ children, allowedRoles = [], permissions = [], fallback = null }) => {
  const { user } = useAuth();

  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(user?.role_name || '');
  const permissionAllowed = permissions.length === 0 || hasAnyPermission(user, permissions);

  if (!user || !roleAllowed || !permissionAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  fallback?: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ children, permission, permissions = [], fallback = null }) => {
  const { user } = useAuth();
  const requiredPermissions = permission ? [permission] : permissions;

  if (!hasAnyPermission(user, requiredPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
