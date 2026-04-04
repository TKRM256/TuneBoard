import { type VercelConfig, deploymentEnv, routes } from '@vercel/config/v1';

export const config: VercelConfig = {
  outputDirectory: 'dist',
  rewrites: [
    routes.rewrite('/api/:path*', `${deploymentEnv('BACKEND_URL')}/api/:path*`),
    routes.rewrite('/(.*)', '/index.html')
  ],
};