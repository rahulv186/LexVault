import React from 'react';
import { useAuth } from '../context/AuthContext';
import { hasAnyPermission } from '../utils/permissions';

export const RoleGate = ({ children, allowedRoles = [], permissions = [], fallback = null }) => {
  const { user } = useAuth();

  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(user?.role_name);
  const permissionAllowed = permissions.length === 0 || hasAnyPermission(user, permissions);

  if (!user || !roleAllowed || !permissionAllowed) {
    return fallback;
  }

  return <>{children}</>;
};

export const PermissionGate = ({ children, permission, permissions = [], fallback = null }) => {
  const { user } = useAuth();
  const requiredPermissions = permission ? [permission] : permissions;

  if (!hasAnyPermission(user, requiredPermissions)) {
    return fallback;
  }

  return <>{children}</>;
};
