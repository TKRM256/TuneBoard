import { type VercelConfig, deploymentEnv, routes } from '@vercel/config/v1';

export const config: VercelConfig = {
  outputDirectory: 'dist',
  rewrites: [
    routes.rewrite('/api/:path*', `${deploymentEnv('BACKEND_URL')}/api/:path*`),
    routes.rewrite('/login', '/index.html'),
    routes.rewrite('/public/lives/:publicToken', '/index.html'),
    routes.rewrite('/public/lives/:publicToken/submissions/shared', '/index.html'),
    routes.rewrite('/public/lives/:publicToken/submissions/:submissionId', '/index.html'),
    routes.rewrite('/public/lives/:publicToken/submissions/:submissionId/shared', '/index.html'),
    routes.rewrite('/tenants', '/index.html'),
    routes.rewrite('/tenants/:tenantId/lives', '/index.html'),
    routes.rewrite('/tenants/:tenantId/lives/:liveId', '/index.html'),
    routes.rewrite('/tenants/:tenantId/lives/:liveId/form', '/index.html'),
    routes.rewrite('/tenants/:tenantId/lives/:liveId/submissions', '/index.html'),
    routes.rewrite('/tenants/:tenantId/lives/:liveId/settings', '/index.html')
  ],
};