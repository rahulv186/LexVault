import { User } from '../types/user';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'evidence:create',
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
    'evidence:delete',
    'zk:generate',
    'zk:verify',
    'users:read',
    'users:manage',
  ],
  INVESTIGATOR: [
    'evidence:create',
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
    'zk:generate',
    'zk:verify',
  ],
  FORENSIC_ANALYST: [
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
    'zk:generate',
    'zk:verify',
  ],
  AUDITOR: [
    'evidence:read',
    'evidence:verify',
    'evidence:custody:read',
    'evidence:custody:verify',
    'zk:verify',
  ],
  VIEWER: [
    'evidence:read',
    'evidence:custody:read',
  ],
};

export const getUserPermissions = (user: User | null | undefined): string[] => {
  if (!user) return [];
  if (Array.isArray((user as any).permissions)) return (user as any).permissions;
  return ROLE_PERMISSIONS[user.role_name] || [];
};

export const hasPermission = (user: User | null | undefined, permission: string | null | undefined): boolean => {
  if (!permission) return true;
  return getUserPermissions(user).includes(permission);
};

export const hasAnyPermission = (user: User | null | undefined, permissions: string[] = []): boolean => {
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(user, permission));
};
