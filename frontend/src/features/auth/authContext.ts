import { createContext, useContext } from 'react';
import type { AuthMe } from './useAuth';

export type AuthContextValue = {
  authMe: AuthMe | null;
  loginWithGoogle: () => void;
  logout: () => void;
  refreshAuth: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
