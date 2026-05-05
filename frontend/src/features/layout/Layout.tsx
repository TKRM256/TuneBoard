import { Outlet, Link } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/authContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut } from 'lucide-react';

export const Layout = () => {
    const { authMe, logout, isAuthLoading } = useAuthContext();

    const name = authMe?.name || authMe?.email || 'User';

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-xl font-bold" aria-label="TuneBoard">
                            TuneBoard
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
                        <ThemeToggle className="w-full sm:w-auto" />
                        {isAuthLoading ? (
                            <span className="text-muted-foreground">認証確認中...</span>
                        ) : authMe?.authenticated ? (
                            <>
                                {authMe.picture ? (
                                    <img src={authMe.picture} alt="Avatar" aria-label="Avatar" className="size-8 rounded-full" />
                                ) : <span className="size-8 rounded-full bg-muted flex items-center justify-center text-xs text-white">{name.charAt(0)}</span>}
                                <span className="truncate text-muted-foreground sm:max-w-48">{name}</span>
                                <Button className="w-full sm:w-auto" onClick={logout} variant="outline" size="sm">                                    
                                    <LogOut/>
                                    <span className="sm:inline">Logout</span>
                                </Button>
                            </>
                        ) : null }
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl p-3 sm:p-4">
                <Outlet />
            </main>
        </div>
    );
}

export const FullWidthLayout = () => {
    const { authMe, logout, isAuthLoading } = useAuthContext();

    const name = authMe?.name || authMe?.email || 'User';

    return (
        <div className="h-screen flex flex-col border-4 bg-background overflow-hidden">
            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-screen flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-xl font-bold" aria-label="TuneBoard">
                            TuneBoard
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
                        <ThemeToggle className="w-full sm:w-auto" />
                        {isAuthLoading ? (
                            <span className="text-muted-foreground">認証確認中...</span>
                        ) : authMe?.authenticated ? (
                            <>
                                {authMe.picture ? (
                                    <img src={authMe.picture} alt="Avatar" aria-label="Avatar" className="size-8 rounded-full" />
                                ) : <span className="size-8 rounded-full bg-muted flex items-center justify-center text-xs text-white">{name.charAt(0)}</span>}
                                <span className="truncate text-muted-foreground sm:max-w-48">{name}</span>
                                <Button className="w-full sm:w-auto" onClick={logout} variant="outline" size="sm">                                    
                                    <LogOut/>
                                    <span className="sm:inline">Logout</span>
                                </Button>
                            </>
                        ) : null }
                    </div>
                </div>
            </header>
            <main className="mx-auto flex-1 w-full">
                <Outlet />
            </main>
        </div>
    );
}