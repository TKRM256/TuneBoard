import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/authContext';
import { LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
            <CardHeader>
                <h1 className="text-2xl font-bold">TuneBoard</h1>
            </CardHeader>
            <CardContent>
                <Button onClick={() => loginWithGoogle(redirect)} variant="outline" size="lg" className="w-full">
                    <LogIn className="mr-2" />
                    Googleアカウントでログイン                
                </Button>
            </CardContent>
        </Card>
    </div>
  );
};
