import { type VercelConfig, deploymentEnv } from '@vercel/config/v1';

const apiUrl = deploymentEnv('API_URL');

export const config: VercelConfig = {
  outputDirectory: 'dist',
  rewrites: [
    {
      source: '/api/(.*)',
      destination: `${apiUrl}/api/$1`,
    },
    {
      source: '^/(?!api/)(?!.*\\..*$).*$',
      destination: '/index.html',
    },
  ],
};