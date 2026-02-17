import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, clearAuthTokens } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authData = localStorage.getItem('teamhub_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.user) {
          // Verify token is still valid by fetching current user
          try {
            const currentUser = await auth.getCurrentUser();
            setUser(currentUser);
          } catch (err) {
            // Token expired or invalid
            clearAuthTokens();
            setUser(null);
          }
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      const response = await auth.login(email, password, rememberMe);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (name, email, password, password2) => {
    try {
      setError(null);
      const response = await auth.register({ name, email, password, password2 });
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      clearAuthTokens();
    }
  };

  const updateUser = async (data) => {
    try {
      setError(null);
      const updatedUser = await auth.updateProfile(data);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
