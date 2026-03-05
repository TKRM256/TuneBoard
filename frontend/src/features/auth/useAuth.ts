import { apiClient, clearAccessToken } from '@/lib/api/client';
import { useState, useEffect, useCallback } from 'react';

export interface AuthMe {
  authenticated: boolean;
  name?: string;
  email?: string;
  picture?: string;
}


export const useAuth = () => {
    const [authMe, setAuthMe] = useState<AuthMe | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const checkAuth = useCallback(() => {
      setIsAuthLoading(true);
      apiClient
        .get<AuthMe>('/auth/me')
        .then((data) => {
          if (data && typeof data === 'object' && 'authenticated' in data) {
            setAuthMe(data as AuthMe);
          } else {
            setAuthMe(null);
          }
        })
        .catch(() => {
          setAuthMe(null);
        })
        .finally(() => {
          setIsAuthLoading(false);
        });
    }, []);
    
    const exchangeTokenAfterLogin = useCallback(() => {
      const params = new URLSearchParams(window.location.search);
      const login = params.get('login');

      if (login !== 'success') {
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.toString());
    }, []);
    
    useEffect(() => {
      exchangeTokenAfterLogin();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkAuth();
    }, [checkAuth, exchangeTokenAfterLogin]);
    
    const loginWithGoogle = useCallback((redirectPath?: string) => {
      const fallback = `${window.location.pathname}${window.location.search}`;
      const redirectTarget = redirectPath && redirectPath.startsWith('/')
        ? redirectPath
        : fallback;
      const loginUrl = `/api/auth/google/login?redirect=${encodeURIComponent(redirectTarget)}`;
      window.location.href = loginUrl;
    }, []);
    
    const logout = useCallback (() => {
      clearAccessToken();
      apiClient.post('/auth/logout').finally(() => {
        setAuthMe(null);
        checkAuth();
      });
    }, [checkAuth]);

    return { loginWithGoogle, logout, authMe, checkAuth, isAuthLoading };
}