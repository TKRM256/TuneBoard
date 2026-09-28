import { Outlet } from 'react-router-dom';

import { AppHeader } from './AppHeader';

export const Layout = () => {
    return (
        <div className="min-h-screen bg-background">
            <AppHeader containerClassName="max-w-6xl" />
            <main className="mx-auto max-w-6xl p-3 sm:p-4">
                <Outlet />
            </main>
        </div>
    );
}

export const FullWidthLayout = () => {
    return (
        <div className="h-screen flex flex-col border-4 bg-background overflow-hidden">
            <AppHeader containerClassName="max-w-screen" />
            {/* min-h-0 が無いと中身の高さで main が伸び、子の h-full / 内部スクロールが効かなくなる */}
            <main className="mx-auto min-h-0 w-full flex-1">
                <Outlet />
            </main>
        </div>
    );
}
