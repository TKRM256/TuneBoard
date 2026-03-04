import { type ApiError, ApiClientError } from './type';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

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

// ──────────────────────────────────────
// Core
// ──────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T|void> {
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers);

  if(!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const credentials = options.credentials ?? 'include';

  const response = await fetch(url, {
    ...options,
    headers,
    credentials,
  });

  if (!response.ok) {
    let apiError: ApiError | undefined;
    try {
      apiError = await response.json();
    } catch {
      throw new ApiClientError(response.status);
    }
    throw new ApiClientError(response.status, apiError);
  }

  // 204 No Content
  if (response.status === 204) {
    return;
  }

  return response.json();
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
