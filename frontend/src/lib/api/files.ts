/** ファイルのアップロード（multipart）と、認証が必要な画像などのバイナリの取得。
 *  apiClient は JSON 専用なので、ヘッダーの付け方だけ合わせてここで扱う。 */
import { API_BASE_URL, getAccessToken } from './client';
import { ApiClientError, type ApiError } from './type';

function authHeaders(stateChanging: boolean): Headers {
  const headers = new Headers();
  if (stateChanging) headers.set('X-Requested-With', 'TuneBoard');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function toError(response: Response): Promise<ApiClientError> {
  let apiError: ApiError | undefined;
  try {
    apiError = (await response.json()) as ApiError;
  } catch {
    // 本文が JSON でないときはステータスだけで返す
  }
  return new ApiClientError(response.status, apiError, apiError);
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(true),
    body,
    credentials: 'same-origin',
  });
  if (!response.ok) throw await toError(response);
  return (await response.json()) as T;
}

export async function fetchBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(false),
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) throw await toError(response);
  return response.blob();
}
