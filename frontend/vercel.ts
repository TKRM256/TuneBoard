import { type VercelConfig } from '@vercel/config/v1';

declare const process: {
  env: Record<string, string | undefined>;
};

const apiUrl = process.env.API_URL?.trim();

if (!apiUrl) {
  throw new Error('Missing API_URL environment variable for Vercel rewrites.');
}

const normalizedApiUrl = apiUrl.replace(/\/+$/, '');

export const config: VercelConfig = {
  outputDirectory: 'dist',
  rewrites: [
    {
      source: '/api/(.*)',
      destination: `${normalizedApiUrl}/api/$1`,
    },
    {
      source: '^/(?!api/)(?!.*\\..*$).*$',
      destination: '/index.html',
    },
  ],
};