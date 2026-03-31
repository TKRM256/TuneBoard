import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/authContext';
import { FileText, ListChecks, Users, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';

const GoogleIcon = () => (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox = "0 0 48 48" className="opacity-100">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917"/>
        <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917"/>
    </svg>
);


const features = [
  { icon: FileText, text: 'セッティングシートをオンラインで作成・管理' },
  { icon: ListChecks, text: '入力フォームを自由にカスタマイズ' },
  { icon: Search, text: '曲の被りを自動で検出' },
  { icon: Users, text: '出演者はログイン不要で記入可能' },
] as const;

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-6 pt-8 pb-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">TuneBoard</h1>
          </div>

          <ul className="grid gap-3 text-sm">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="size-5 shrink-0 text-primary mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <Separator />

          <div className="space-y-3 text-center">
            {isAuthLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                <span>認証確認中...</span>
              </div>
            ) : (
              <Button
                onClick={() => loginWithGoogle(redirect)}
                variant="outline"
                size="lg"
                className="w-full gap-2"
              >
                <GoogleIcon />
                Googleアカウントでログイン
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
