import process from 'node:process';

import { deploymentEnv, routes, type VercelConfig } from '@vercel/config/v1';

const apiUrl = process.env.API_URL?.trim();
const vercelEnv = process.env.VERCEL_ENV ?? 'unknown';
const runtimeApiUrl = deploymentEnv('API_URL');

console.info(`[vercel.ts] VERCEL_ENV=${vercelEnv}`);
console.info(`[vercel.ts] API_URL(build env)=${apiUrl ?? '(undefined)'}`);
console.info(`[vercel.ts] API_URL(route env)=${runtimeApiUrl}`);

if (!apiUrl) {
  throw new Error('[vercel.ts] Missing API_URL environment variable.');
}

const normalizedApiUrl = apiUrl.replace(/\/+$/, '');
const apiDestination = `${runtimeApiUrl}/api/$1`;

console.info(`[vercel.ts] rewrite /api/(.*) -> ${normalizedApiUrl}/api/$1`);

export const config: VercelConfig = {
  rewrites: [
    routes.rewrite('/api/(.*)', apiDestination),
    routes.rewrite('/(.*)', '/index.html'),
  ],
};