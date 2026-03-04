import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authMe, loginWithGoogle, logout, checkAuth, isAuthLoading } = useAuth();

  return (
    <AuthContext.Provider
      value={{
        authMe,
        loginWithGoogle,
        logout,
        refreshAuth: checkAuth,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
