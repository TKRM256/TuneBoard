/** PDF や ZIP をバックエンドから受け取り、ファイルとして保存する。 */
import { API_BASE_URL, getAccessToken } from '@/lib/api/client';
import { ApiClientError, type ApiError } from '@/lib/api/type';

export interface PdfFetchResult {
  blob: Blob;
  filename: string;
}

export async function postForBlob(path: string, body: unknown, opts: { signal?: AbortSignal } = {}): Promise<PdfFetchResult> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'X-Requested-With': 'TuneBoard' });
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'same-origin',
    signal: opts.signal,
  });
  if (!response.ok) {
    let apiError: ApiError | undefined;
    try {
      apiError = (await response.json()) as ApiError;
    } catch {
      // 本文が JSON でなければ、状態コードだけで知らせる
    }
    throw new ApiClientError(response.status, apiError);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  return { blob, filename: parseFilename(disposition) };
}

function parseFilename(disposition: string): string {
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // 下の書き方で読めるか試す
    }
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch) return plainMatch[1].trim();
  return 'download';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
