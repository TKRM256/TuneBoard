import { type VercelConfig, deploymentEnv, routes } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    routes.rewrite('/api/(.*)', `${deploymentEnv('API_URL')}/api/$1`),
    routes.rewrite('/(.*)', '/index.html')
  ]
};