/** ログイン後の画面で共通のヘッダー。スマホでも1行に収め、名前や文言は sm 以上でだけ出す。 */
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthContext } from '@/features/auth/authContext';
import { cn } from '@/lib/utils';

export const AppHeader = ({ containerClassName }: { containerClassName?: string }) => {
    const { authMe, logout, isAuthLoading } = useAuthContext();

    const name = authMe?.name || authMe?.email || 'User';

    return (
        <header className="shrink-0 border-b bg-card">
            <div className={cn('mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3', containerClassName)}>
                <Link to="/" className="shrink-0 text-lg font-bold sm:text-xl" aria-label="TuneBoard">
                    TuneBoard
                </Link>
                <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
                    <ThemeToggle labelClassName="hidden sm:inline" />
                    {isAuthLoading ? (
                        <span className="text-xs text-muted-foreground">認証確認中...</span>
                    ) : authMe?.authenticated ? (
                        <>
                            {authMe.picture ? (
                                <img src={authMe.picture} alt={name} title={name} className="size-7 shrink-0 rounded-full sm:size-8" />
                            ) : (
                                <span
                                    title={name}
                                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground sm:size-8"
                                >
                                    {name.charAt(0)}
                                </span>
                            )}
                            <span className="hidden max-w-48 truncate text-muted-foreground sm:inline">{name}</span>
                            <Button onClick={logout} variant="outline" size="sm" aria-label="ログアウト">
                                <LogOut />
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </>
                    ) : null}
                </div>
            </div>
        </header>
    );
};
