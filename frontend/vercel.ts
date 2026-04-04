import { type VercelConfig, routes } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    routes.rewrite('/api/(.*)', 'https://tuneboard-develop-407267645629.asia-northeast1.run.app/api/$1'),
    routes.rewrite('/(.*)', '/index.html')
  ]
};