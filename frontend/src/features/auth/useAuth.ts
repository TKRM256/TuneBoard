import { apiClient, clearAccessToken, API_BASE_URL } from '@/lib/api/client';
import { useSingleFlight } from '@/hooks/use-single-flight';
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
  const { run: runLogout } = useSingleFlight();

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
      checkAuth();
    }, [checkAuth, exchangeTokenAfterLogin]);
    
    const loginWithGoogle = useCallback((redirectPath?: string) => {
      const fallback = `${window.location.pathname}${window.location.search}`;
      const redirectTarget = redirectPath && redirectPath.startsWith('/')
        ? redirectPath
        : fallback;
      const loginUrl = `${API_BASE_URL}/auth/google/login?redirect=${encodeURIComponent(redirectTarget)}`;
      window.location.href = loginUrl;
    }, []);
    
    const logout = useCallback (() => {
      void runLogout(async () => {
        clearAccessToken();
        try {
          await apiClient.post('/auth/logout');
        } catch (error) {
          void error;
        } finally {
          setAuthMe(null);
          checkAuth();
        }
      });
    }, [checkAuth, runLogout]);

    return { loginWithGoogle, logout, authMe, checkAuth, isAuthLoading };
}