import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDenied } from './AccessDenied';
import { hasPermission } from '../utils/permissions';

export const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-security-black">
        <div className="w-12 h-12 border-4 border-security-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const RequirePermission = ({ children, permission }) => {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) {
    return <AccessDenied />;
  }

  return children;
};
