import { apiClient, clearAccessToken, API_BASE_URL } from '@/lib/api/client';
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
    
    const exchangeTokenAfterLogin = useCallback(async () => {
      const params = new URLSearchParams(window.location.search);
      const login = params.get('login');
      const authCode = params.get('auth_code');

      if (login || authCode) {
        const url = new URL(window.location.href);
        url.searchParams.delete('login');
        url.searchParams.delete('auth_code');
        window.history.replaceState({}, '', url.toString());
      }

      if (login === 'success' && authCode) {
        try {
          await apiClient.post('/auth/exchange', { code: authCode });
        } catch {
          // cookie may have been set by redirect — proceed to checkAuth
        }
      }
    }, []);
    
    useEffect(() => {
      exchangeTokenAfterLogin().then(() => checkAuth());
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
      clearAccessToken();
      apiClient.post('/auth/logout').finally(() => {
        setAuthMe(null);
        checkAuth();
      });
    }, [checkAuth]);

    return { loginWithGoogle, logout, authMe, checkAuth, isAuthLoading };
}