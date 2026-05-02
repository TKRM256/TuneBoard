/** API helpers for fetching/downloading setting-sheet PDFs from the backend. */
import { API_BASE_URL, getAccessToken } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';

export type PdfPaperSize = 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'LETTER';
export type PdfOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface PdfLayoutOptions {
  paperSize?: PdfPaperSize;
  orientation?: PdfOrientation;
  baseFontSize?: number;
  marginMm?: number;
  includeItunesLinks?: boolean;
  autoFitOnePage?: boolean;
}

export interface PdfPaperSizeOption {
  value: PdfPaperSize;
  label: string;
  description: string;
}

export const PDF_PAPER_SIZE_OPTIONS: PdfPaperSizeOption[] = [
  { value: 'A4', label: 'A4', description: '210 × 297 mm（標準）' },
  { value: 'A3', label: 'A3', description: '297 × 420 mm（大判）' },
  { value: 'A5', label: 'A5', description: '148 × 210 mm（コンパクト）' },
  { value: 'B4', label: 'B4', description: '257 × 364 mm' },
  { value: 'B5', label: 'B5', description: '182 × 257 mm' },
  { value: 'LETTER', label: 'Letter', description: '216 × 279 mm（米国）' },
];

export const PDF_ORIENTATION_OPTIONS: Array<{ value: PdfOrientation; label: string }> = [
  { value: 'LANDSCAPE', label: '横向き' },
  { value: 'PORTRAIT', label: '縦向き' },
];

function buildQueryString(options: PdfLayoutOptions): string {
  const params = new URLSearchParams();
  if (options.paperSize) params.set('paperSize', options.paperSize);
  if (options.orientation) params.set('orientation', options.orientation);
  if (options.baseFontSize !== undefined) params.set('baseFontSize', String(options.baseFontSize));
  if (options.marginMm !== undefined) params.set('marginMm', String(options.marginMm));
  if (options.includeItunesLinks !== undefined) params.set('includeItunesLinks', String(options.includeItunesLinks));
  if (options.autoFitOnePage !== undefined) params.set('autoFitOnePage', String(options.autoFitOnePage));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

interface PdfFetchResult {
  blob: Blob;
  filename: string;
}

export async function fetchSubmissionPdf(
  liveId: string,
  submissionId: string,
  options: PdfLayoutOptions,
): Promise<PdfFetchResult> {
  const url = `${API_BASE_URL}/lives/${liveId}/setting-sheet/submissions/${submissionId}/pdf${buildQueryString(options)}`;
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { method: 'GET', headers, credentials: 'same-origin' });
  if (!response.ok) {
    throw new ApiClientError(response.status);
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
  return 'submission.pdf';
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
