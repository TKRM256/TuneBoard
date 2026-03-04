import { apiClient, setAccessToken, clearAccessToken } from '@/lib/api/client';
import { useState, useEffect, useCallback } from 'react';

export interface AuthMe {
  authenticated: boolean;
  name?: string;
  email?: string;
  picture?: string;
}


export const useAuth = () => {
    const [authMe, setAuthMe] = useState<AuthMe | null>(null);

    const checkAuth = useCallback(() => {
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
        });
    }, []);
    
    const exchangeTokenAfterLogin = useCallback(() => {
      const params = new URLSearchParams(window.location.search);
      const login = params.get('login');
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const token = hashParams.get('token');

      if (login !== 'success') {
        return;
      }

      if (token) {
        setAccessToken(token);
      }
      checkAuth();

      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
    }, [checkAuth]);
    
    useEffect(() => {
      exchangeTokenAfterLogin();
      checkAuth();
    }, [checkAuth, exchangeTokenAfterLogin]);
    
    const loginWithGoogle = useCallback(() => {
      const loginUrl = `/api/auth/google/login?redirect=${encodeURIComponent(window.location.origin)}`;
      window.location.href = loginUrl;
    }, []);
    
    const logout = useCallback (() => {
      clearAccessToken();
      apiClient.post('/auth/logout').finally(() => {
        setAuthMe(null);
        checkAuth();
      });
    }, [checkAuth]);

    return { loginWithGoogle, logout, authMe, checkAuth };
}