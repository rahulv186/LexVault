export const ROLE_PERMISSIONS = {
  ADMIN: [
    'evidence:create',
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
    'evidence:delete',
    'users:read',
    'users:manage',
  ],
  INVESTIGATOR: [
    'evidence:create',
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
  ],
  FORENSIC_ANALYST: [
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
  ],
  AUDITOR: [
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
  ],
  VIEWER: [
    'evidence:read',
    'evidence:custody:read',
  ],
};

export const getUserPermissions = (user) => {
  if (!user) return [];
  if (Array.isArray(user.permissions)) return user.permissions;
  return ROLE_PERMISSIONS[user.role_name] || [];
};

export const hasPermission = (user, permission) => {
  if (!permission) return true;
  return getUserPermissions(user).includes(permission);
};

export const hasAnyPermission = (user, permissions = []) => {
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(user, permission));
};
