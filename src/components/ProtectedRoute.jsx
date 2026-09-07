import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-security-black">
        <div className="w-12 h-12 border-4 border-security-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role_name !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen bg-security-black">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-500 mb-6">
            You do not have the required permissions ({requiredRole}) to access this resource.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-2 bg-security-accent text-security-black font-bold rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
};
