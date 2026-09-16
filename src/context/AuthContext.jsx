import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { hasPermission, hasAnyPermission } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('lexvault_token');
      if (token) {
        try {
          const response = await apiClient.get('/api/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          localStorage.removeItem('lexvault_token');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        username,
        password,
      });

      const { access_token } = response.data;
      localStorage.setItem('lexvault_token', access_token);

      // Fetch user profile after login
      const userResponse = await apiClient.get('/api/auth/me');
      const userData = userResponse.data;

      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Incorrect username or password');
      } else if (error.response?.status === 403) {
        throw new Error('Your account is inactive. Please contact an administrator.');
      } else if (error.response?.status === 422) {
        const detail = error.response.data?.detail;
        const msg = typeof detail === 'string' ? detail : (detail?.[0]?.msg || 'Invalid input');
        throw new Error(msg);
      }
      throw new Error(error.response?.data?.detail || 'An unexpected error occurred during login');
    }
  };

  const logout = () => {
    localStorage.removeItem('lexvault_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
