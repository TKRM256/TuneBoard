import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { FullWidthLayout, Layout } from '@/features/layout/Layout';
import { RequireAuth } from '@/features/auth/RequireAuth';

const Login = lazy(() => import('@/features/auth/pages/Login').then((module) => ({ default: module.Login })));
const PublicLivePage = lazy(() => import('@/features/public/pages/PublicLivePage').then((module) => ({ default: module.PublicLivePage })));
const PublicSubmissionSharedPage = lazy(() => import('@/features/public/pages/PublicSubmissionSharedPage').then((module) => ({ default: module.PublicSubmissionSharedPage })));
const TenantsPage = lazy(() => import('./features/tenants/pages/TenantsPage').then((module) => ({ default: module.TenantsPage })));
const TenantLivesPage = lazy(() => import('./features/lives/pages/TenantLivesPage').then((module) => ({ default: module.TenantLivesPage })));
const LiveManagementPage = lazy(() => import('./features/lives/pages/LiveManagementPage').then((module) => ({ default: module.LiveManagementPage })));
const LiveFormEditorPage = lazy(() => import('./features/lives/pages/LiveFormEditorPage').then((module) => ({ default: module.LiveFormEditorPage })));
const LiveSubmissionsPage = lazy(() => import('./features/lives/pages/LiveSubmissionsPage').then((module) => ({ default: module.LiveSubmissionsPage })));
const LiveVisibilitySettingsPage = lazy(() => import('./features/lives/pages/LiveVisibilitySettingsPage').then((module) => ({ default: module.LiveVisibilitySettingsPage })));
const VenueFormEditorPage = lazy(() => import('./features/lives/venue-form/VenueFormEditorPage').then((module) => ({ default: module.VenueFormEditorPage })));
const PdfLayoutsPage = lazy(() => import('./features/lives/venue-form/PdfLayoutsPage').then((module) => ({ default: module.PdfLayoutsPage })));
const StagePlotSettingsPage = lazy(() => import('./features/stage-plot/StagePlotSettingsPage').then((module) => ({ default: module.StagePlotSettingsPage })));
const InvitationAcceptPage = lazy(() => import('./features/tenants/pages/InvitationAcceptPage').then((module) => ({ default: module.InvitationAcceptPage })));

const routeFallback = (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
    読み込み中...
  </div>
);

const lazyRoute = (element: React.ReactNode) => <Suspense fallback={routeFallback}>{element}</Suspense>;

// 未保存の変更がある画面で遷移をせき止められるよう（useBlocker）、データルーターを使う。
const router = createBrowserRouter([
  { path: '/login', element: lazyRoute(<Login />) },
  { path: '/public/lives/:publicToken', element: lazyRoute(<PublicLivePage />) },
  { path: '/public/lives/:publicToken/submissions/:submissionId', element: lazyRoute(<PublicLivePage />) },
  { path: '/public/lives/:publicToken/submissions/:submissionId/shared', element: lazyRoute(<PublicSubmissionSharedPage />) },
  { path: '/public/lives/:publicToken/submissions/shared', element: lazyRoute(<PublicSubmissionSharedPage />) },
  { path: '/invitation/:token', element: lazyRoute(<InvitationAcceptPage />) },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="tenants" replace /> },
      { path: 'tenants', element: lazyRoute(<TenantsPage />) },
      { path: 'tenants/:tenantId/lives', element: lazyRoute(<TenantLivesPage />) },
      { path: 'tenants/:tenantId/lives/:liveId', element: lazyRoute(<LiveManagementPage />) },
      { path: 'tenants/:tenantId/lives/:liveId/form', element: lazyRoute(<LiveFormEditorPage />) },
      { path: 'tenants/:tenantId/lives/:liveId/submissions', element: lazyRoute(<LiveSubmissionsPage />) },
      { path: 'tenants/:tenantId/lives/:liveId/settings', element: lazyRoute(<LiveVisibilitySettingsPage />) },
      { path: 'tenants/:tenantId/lives/:liveId/stage-plot', element: lazyRoute(<StagePlotSettingsPage />) },
      { path: 'tenants/:tenantId/lives/:liveId/pdf-layouts', element: lazyRoute(<PdfLayoutsPage />) },
      // 書式を 1 つにまとめる前の URL。ブックマークから来ても迷わないよう、書式の一覧へ送る
      { path: 'tenants/:tenantId/lives/:liveId/venue-form', element: <Navigate to="../pdf-layouts" relative="path" replace /> },
      { path: 'tenants/:tenantId/lives/:liveId/submissions/pdf-preview', element: <Navigate to=".." relative="path" replace /> },
      { path: 'tenants/:tenantId/lives/:liveId/submissions/pdf-preview-mobile', element: <Navigate to=".." relative="path" replace /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <FullWidthLayout />
      </RequireAuth>
    ),
    children: [
      { path: 'tenants/:tenantId/lives/:liveId/pdf-layouts/:layoutId', element: lazyRoute(<VenueFormEditorPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
