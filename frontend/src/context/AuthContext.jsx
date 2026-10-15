import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthSession, clearAuthSession, getCurrentUser, registerSecurityCallbacks } from '../api';
import { MOCK_USERS } from '../mocks/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [blockedModalState, setBlockedModalState] = useState(null);

  useEffect(() => {
    // Register security hooks with central api client
    registerSecurityCallbacks({
      onUnauthorized: () => {
        setUser(null);
      },
      onForbidden: (errorData) => {
        setBlockedModalState(errorData || { reason: 'Access Denied: Read blocked by Consent or RBAC gate.' });
      }
    });
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setAuthSession(res.token, res.user);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    setBlockedModalState(null);
  };

  /**
   * Fast demo role switcher (useful for hackathon evaluation)
   */
  const switchDemoRole = (role) => {
    const matched = MOCK_USERS.find((u) => u.role === role);
    if (matched) {
      const mockToken = `mock-token-${matched.role}-${Date.now()}`;
      setAuthSession(mockToken, matched);
      setUser(matched);
      return matched;
    }
  };

  const clearBlockedModal = () => {
    setBlockedModalState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role,
        login,
        logout,
        switchDemoRole,
        blockedModalState,
        setBlockedModalState,
        clearBlockedModal
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
