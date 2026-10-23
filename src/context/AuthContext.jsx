import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AGENT_TOKEN_KEY = 'memorial_agent_token';
export const AGENT_USER_KEY = 'memorial_agent_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AGENT_TOKEN_KEY) || null);
  const [agentUser, setAgentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AGENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(token && agentUser?.role === 'AGENT'));
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      const storedToken = localStorage.getItem(AGENT_TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) {
          setIsAuthenticated(false);
          setToken(null);
          setAgentUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (isMounted) {
          if (res.data && res.data.role === 'AGENT') {
            setIsAuthenticated(true);
            setToken(storedToken);
            setAgentUser(prev => ({ ...prev, ...res.data }));
          } else if (res.data && res.data.role !== 'AGENT') {
            // Not an agent
            logout();
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[AuthContext] Session validation error:', err);
        // If 401 or token expired, log out
        if (isMounted) {
          if (err.response?.status === 401) {
            logout();
          }
          setIsLoading(false);
        }
      }
    }

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Execute login API call with agent credentials
   */
  const login = async (email, password) => {
    const normalizedEmail = (email || '').trim();
    if (!normalizedEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    const response = await api.post('/auth/login', {
      email: normalizedEmail,
      password,
    });

    const { access_token, user } = response.data || {};

    if (!access_token || !user) {
      throw new Error('Authentication response is missing access credentials.');
    }

    // Role verification: Must be an AGENT
    if (user.role !== 'AGENT') {
      throw new Error('Access denied. Only registered Sales Agents can log into this portal.');
    }

    // Store JWT and agent details in localStorage
    localStorage.setItem(AGENT_TOKEN_KEY, access_token);
    localStorage.setItem(AGENT_USER_KEY, JSON.stringify(user));

    setToken(access_token);
    setAgentUser(user);
    setIsAuthenticated(true);

    return { success: true, user, token: access_token };
  };

  /**
   * Log out agent and clear local storage
   */
  const logout = () => {
    try {
      localStorage.removeItem(AGENT_TOKEN_KEY);
      localStorage.removeItem(AGENT_USER_KEY);
    } catch {}
    setToken(null);
    setAgentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        agentUser,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
