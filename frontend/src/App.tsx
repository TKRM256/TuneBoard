import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Layout } from '@/features/layout/Layout';
import { RequireAuth } from '@/features/auth/RequireAuth';

const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const PublicLivePage = lazy(() => import('@/pages/public/PublicLivePage').then((module) => ({ default: module.PublicLivePage })));
const PublicSubmissionSharedPage = lazy(() => import('@/pages/public/PublicSubmissionSharedPage').then((module) => ({ default: module.PublicSubmissionSharedPage })));
const TenantsPage = lazy(() => import('./features/tenants/TenantsPage').then((module) => ({ default: module.TenantsPage })));
const TenantLivesPage = lazy(() => import('./features/lives/TenantLivesPage').then((module) => ({ default: module.TenantLivesPage })));
const LiveManagementPage = lazy(() => import('./features/lives/LiveManagementPage').then((module) => ({ default: module.LiveManagementPage })));
const LiveFormEditorPage = lazy(() => import('./features/lives/LiveFormEditorPage').then((module) => ({ default: module.LiveFormEditorPage })));
const LiveSubmissionsPage = lazy(() => import('./features/lives/LiveSubmissionsPage').then((module) => ({ default: module.LiveSubmissionsPage })));

const routeFallback = (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
    読み込み中...
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Suspense fallback={routeFallback}><Login /></Suspense>} />
          <Route path="/public/lives/:publicToken" element={<Suspense fallback={routeFallback}><PublicLivePage /></Suspense>} />
          <Route path="/public/lives/:publicToken/submissions/:submissionId" element={<Suspense fallback={routeFallback}><PublicLivePage /></Suspense>} />
          <Route path="/public/lives/:publicToken/submissions/:submissionId/shared" element={<Suspense fallback={routeFallback}><PublicSubmissionSharedPage /></Suspense>} />
          <Route path="/public/lives/:publicToken/submissions/shared" element={<Suspense fallback={routeFallback}><PublicSubmissionSharedPage /></Suspense>} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="tenants" replace />} />
            <Route path="tenants" element={<Suspense fallback={routeFallback}><TenantsPage /></Suspense>} />
            <Route path="tenants/:tenantId/lives" element={<Suspense fallback={routeFallback}><TenantLivesPage /></Suspense>} />
            <Route path="tenants/:tenantId/lives/:liveId" element={<Suspense fallback={routeFallback}><LiveManagementPage /></Suspense>} />
            <Route path="tenants/:tenantId/lives/:liveId/form" element={<Suspense fallback={routeFallback}><LiveFormEditorPage /></Suspense>} />
            <Route path="tenants/:tenantId/lives/:liveId/submissions" element={<Suspense fallback={routeFallback}><LiveSubmissionsPage /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
