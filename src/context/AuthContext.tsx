import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/apiClient';
import { hasPermission, hasAnyPermission } from '../utils/permissions';
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  loginWithWallet: (walletAddress: string, signature: string, message: string) => Promise<User>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
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

  const login = async (username: string, password: string): Promise<User> => {
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
    } catch (error: any) {
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

  const loginWithWallet = async (walletAddress: string, signature: string, message: string): Promise<User> => {
    try {
      const response = await apiClient.post('/api/auth/wallet-login', {
        wallet_address: walletAddress,
        signature: signature,
        message: message,
      });

      const { access_token } = response.data;
      localStorage.setItem('lexvault_token', access_token);

      const userResponse = await apiClient.get('/api/auth/me');
      const userData = userResponse.data;

      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Wallet authentication failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('lexvault_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithWallet,
    logout,
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
