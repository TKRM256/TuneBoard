import { Outlet, Link } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/authContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export const Layout = () => {
    const { authMe, logout, isAuthLoading } = useAuthContext();

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="flex h-14 max-w-screen items-center justify-between px-4">
                    <Link to="/" className="text-xl font-bold" aria-label="TuneBoard">
                        TuneBoard
                    </Link>
                    <div className="flex items-center gap-3 text-sm">
                        {isAuthLoading ? (
                            <span className="text-muted-foreground">認証確認中...</span>
                        ) : authMe?.authenticated ? (
                            <>
                                <img src={authMe.picture} alt="Avatar" aria-label="Avatar" className="size-8 rounded-full" />
                                <span className="text-muted-foreground">{authMe.name || authMe.email || 'User'}</span>
                                <Button onClick={logout} variant="outline" size="sm">                                    
                                    <LogOut/>
                                    Logout
                                </Button>
                            </>
                        ) : null }
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl p-4">
                <Outlet />
            </main>
        </div>
    );
}