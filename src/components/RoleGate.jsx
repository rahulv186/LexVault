import React from 'react';
import { useAuth } from '../context/AuthContext';

export const RoleGate = ({ children, allowedRoles = [], fallback = null }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role_name)) {
    return fallback;
  }

  return <>{children}</>;
};
