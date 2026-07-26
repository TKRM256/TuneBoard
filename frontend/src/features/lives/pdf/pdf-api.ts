/** API helpers for fetching/downloading setting-sheet PDFs from the backend. */
import { API_BASE_URL, apiClient, getAccessToken } from '@/lib/api/client';
import { ApiClientError, type ApiError } from '@/lib/api/type';
import type { CanvasDocument } from './canvas-schema';

export interface PdfFetchResult {
  blob: Blob;
  filename: string;
}

interface PdfCanvasResponse {
  canvas: CanvasDocument | null;
  saved: boolean;
}

/** ライブに保存されている PDF レイアウト。未保存なら null。 */
export async function fetchLivePdfCanvas(liveId: string): Promise<CanvasDocument | null> {
  const response = await apiClient.get<PdfCanvasResponse>(`/lives/${liveId}/pdf-canvas`);
  return response?.canvas ?? null;
}

export async function saveLivePdfCanvas(liveId: string, canvas: CanvasDocument): Promise<void> {
  await apiClient.post<PdfCanvasResponse>(`/lives/${liveId}/pdf-canvas`, { canvas });
}

interface FetchOptions {
  signal?: AbortSignal;
}

export async function fetchSubmissionPdf(
  liveId: string,
  submissionId: string,
  canvas: CanvasDocument,
  fetchOptions: FetchOptions = {},
): Promise<PdfFetchResult> {
  return postForBlob(
    `/lives/${liveId}/setting-sheet/submissions/${submissionId}/pdf`,
    { canvas },
    fetchOptions,
  );
}

export async function fetchSubmissionsZip(
  liveId: string,
  submissionIds: string[],
  canvas: CanvasDocument,
  fetchOptions: FetchOptions = {},
): Promise<PdfFetchResult> {
  return postForBlob(
    `/lives/${liveId}/setting-sheet/submissions/pdf-zip`,
    { submissionIds, canvas },
    fetchOptions,
  );
}

async function postForBlob(path: string, body: unknown, opts: FetchOptions): Promise<PdfFetchResult> {
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
      // ignore parse failures
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
      // fall through
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
