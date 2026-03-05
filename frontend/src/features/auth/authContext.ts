import { createContext, useContext } from 'react';
import type { AuthMe } from './useAuth';

export type AuthContextValue = {
  authMe: AuthMe | null;
  loginWithGoogle: (redirectPath?: string) => void;
  logout: () => void;
  refreshAuth: () => void;
  isAuthLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
