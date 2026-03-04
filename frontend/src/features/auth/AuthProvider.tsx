import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authMe, loginWithGoogle, logout, checkAuth } = useAuth();

  return (
    <AuthContext.Provider
      value={{
        authMe,
        loginWithGoogle,
        logout,
        refreshAuth: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
