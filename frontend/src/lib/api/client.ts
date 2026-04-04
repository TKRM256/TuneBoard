import { type ApiError, ApiClientError } from './type';
import { createLogger } from '../logger';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const log = createLogger('API');
const isProxyApiBase = API_BASE_URL.startsWith('/');
const TRACE_ID_HEADER = 'X-TuneBoard-Trace-Id';
const REQUEST_SOURCE_HEADER = 'X-TuneBoard-Request-Source';
const BACKEND_REACHED_HEADER = 'X-TuneBoard-Backend-Reached';

if (typeof window !== 'undefined' && isProxyApiBase) {
  console.info('[API]', 'Proxy mode enabled', {
    browserOrigin: window.location.origin,
    apiBaseUrl: API_BASE_URL,
    expectedRewrite: '/api/* -> $API_URL/api/*',
  });
}

let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string): void {
  inMemoryAccessToken = token;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
}

function resolveDefaultCredentials(apiBaseUrl: string): RequestCredentials {
  if (apiBaseUrl.startsWith('/')) {
    return 'same-origin';
  }

  try {
    const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
    return apiOrigin === window.location.origin ? 'same-origin' : 'include';
  } catch {
    return 'same-origin';
  }
}

function createTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ──────────────────────────────────────
// Core
// ──────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T|void> {
  const url = `${API_BASE_URL}${path}`;
  const requestUrl = new URL(url, window.location.origin).toString();
  const traceId = createTraceId();

  const headers = new Headers(options.headers);

  const method = (options.method ?? 'GET').toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    headers.set('X-Requested-With', 'TuneBoard');
  }

  if(!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (isProxyApiBase) {
    headers.set(TRACE_ID_HEADER, traceId);
    headers.set(REQUEST_SOURCE_HEADER, 'frontend');
  }

  const credentials = options.credentials ?? resolveDefaultCredentials(API_BASE_URL);

  log.debug(`${method} ${path}`);
  console.info('[API]', 'Request start', {
    method,
    browserRequestUrl: requestUrl,
    apiBaseUrl: API_BASE_URL,
    usesRelativeProxy: isProxyApiBase,
    traceId: isProxyApiBase ? traceId : undefined,
    expectedRewrite: isProxyApiBase ? '/api/* -> $API_URL/api/*' : undefined,
  });

  const response = await fetch(url, {
    ...options,
    headers,
    credentials,
  });

  const responseText = await response.text();

  console.info('[API]', 'Response received', {
    method,
    browserRequestUrl: requestUrl,
    status: response.status,
    ok: response.ok,
    traceId: isProxyApiBase ? traceId : undefined,
    backendReached: response.headers.get(BACKEND_REACHED_HEADER),
    backendTraceId: response.headers.get(TRACE_ID_HEADER),
  });

  if (!response.ok) {
    let apiError: ApiError | undefined;
    try {
      apiError = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      log.error(`${method} ${path} -> ${response.status} (parse error)`);
      throw new ApiClientError(response.status);
    }
    log.warn(`${method} ${path} -> ${response.status}`, apiError?.message);
    throw new ApiClientError(response.status, apiError);
  }

  // 204 No Content or empty body
  if (response.status === 204 || !responseText) {
    return;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    // If parsing fails, throw a clearer error
    throw new ApiClientError(response.status);
  }
}

// ──────────────────────────────────────
// Public API client
// ──────────────────────────────────────
export const apiClient = {
  get<T>(path: string, options: RequestInit = {}): Promise<T|void> {
    return request<T|void>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, options: RequestInit = {}): Promise<T|void> {
    return request<T|void>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown, options: RequestInit = {}): Promise<T|void> {
    return request<T|void>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, options: RequestInit = {}): Promise<T|void> {
    return request<T|void>(path, { ...options, method: 'DELETE' });
  },
};
