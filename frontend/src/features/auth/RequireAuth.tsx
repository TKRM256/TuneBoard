import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './authContext';
import type { JSX } from 'react';

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { authMe, isAuthLoading } = useAuthContext();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        認証状態を確認中...
      </div>
    );
  }

  if (!authMe?.authenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
};
