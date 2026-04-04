import { routes, deploymentEnv, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    routes.rewrite('/api/:path*', `${deploymentEnv('BACKEND_URL')}/api/:path*`),
    routes.rewrite('/(.*)', '/index.html'),
  ],
};
