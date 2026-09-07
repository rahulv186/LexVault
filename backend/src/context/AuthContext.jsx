import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { evidenceService } from '../services/evidenceService'; // We'll add getMe there soon

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lexvault_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Verify token and get user profile
          // We'll implement getMe in a service
          const userData = await fetchCurrentUser();
          setUser(userData);
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  async function fetchCurrentUser() {
    // Temporary implementation until service is updated
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Unauthorized');
    return response.json();
  }

  const login = async (username, password) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('lexvault_token', data.access_token);
    setToken(data.access_token);

    // Fetch user profile immediately after login
    const userData = await fetchCurrentUser();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('lexvault_token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
