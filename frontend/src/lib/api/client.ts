import { type ApiError, ApiClientError } from './type';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const ACCESS_TOKEN_KEY = 'tb_access_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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

  const credentials = token ? 'omit' : options.credentials ?? 'include';

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
  get<T>(path: string): Promise<T|void> {
    return request<T|void>(path, { method: 'GET' });
  },

  post<T>(path: string, body?: unknown): Promise<T|void> {
    return request<T|void>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown): Promise<T|void> {
    return request<T|void>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string): Promise<T|void> {
    return request<T|void>(path, { method: 'DELETE' });
  },
};
