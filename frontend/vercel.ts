import { routes, deploymentEnv } from '@vercel/config/v1';

export default {
  rewrites: [
    routes.rewrite('/api/:path*', `${deploymentEnv('BACKEND_URL')}/api/:path*`),
    routes.rewrite('/(.*)', '/index.html'),
  ],
};
