/** ログインページ。サービスの紹介（ランディングページ）を兼ねる。 */
import { Navigate, useSearchParams } from 'react-router-dom';

import { useAuthContext } from '@/features/auth/authContext';
import { GoogleLoginButton } from '@/features/auth/landing/GoogleLoginButton';
import { Features, Flow, Hero } from '@/features/auth/landing/Sections';

export const Login = () => {
  const { authMe, loginWithGoogle, isAuthLoading } = useAuthContext();
  const [searchParams] = useSearchParams();

  const currentPath = window.location.pathname;
  const defaultFallback = currentPath === '/login' ? '/' : `${currentPath}${window.location.search}`;
  const redirectParams = searchParams.get('redirect');
  const redirect = redirectParams && redirectParams.startsWith('/') ? redirectParams : defaultFallback;

  if (!isAuthLoading && authMe?.authenticated) {
    return <Navigate to={redirect} replace />;
  }

  const login = () => loginWithGoogle(redirect);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ログイン済みのユーザーがすぐ入れるよう、ページのどこまで読んでもログインを右上に残す */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-xl font-extrabold tracking-tight">TuneBoard</span>
          <GoogleLoginButton isLoading={isAuthLoading} onLogin={login} compact />
        </div>
      </header>
      <main>
        <Hero isLoading={isAuthLoading} onLogin={login} />
        <Features />
        <Flow />
      </main>
    </div>
  );
};
