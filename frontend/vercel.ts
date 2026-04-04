const apiUrl = process.env.API_URL?.trim();
const vercelEnv = process.env.VERCEL_ENV ?? 'unknown';

console.info(`[vercel.ts] VERCEL_ENV=${vercelEnv}`);
console.info(`[vercel.ts] API_URL=${apiUrl ?? '(undefined)'}`);

if (!apiUrl) {
  throw new Error('[vercel.ts] Missing API_URL environment variable.');
}

const normalizedApiUrl = apiUrl.replace(/\/+$/, '');
const apiDestination = `${normalizedApiUrl}/api/$1`;

console.info(`[vercel.ts] rewrite /api/(.*) -> ${apiDestination}`);

export const config = {
  rewrites: [
    {
      source: '/api/(.*)',
      destination: apiDestination,
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
};