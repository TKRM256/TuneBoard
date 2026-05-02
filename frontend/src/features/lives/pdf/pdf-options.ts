/** Type definitions and defaults for PDF layout options matching the backend DTO. */

export type PdfPaperSize = 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'LETTER';
export type PdfOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type PdfDensity = 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS';

export interface PdfHeaderOptions {
  showTenantName: boolean;
  showLiveName: boolean;
  showLiveDate: boolean;
  showLiveLocation: boolean;
  showRecordLabel: boolean;
  showSubmittedAt: boolean;
  showSubmissionStatus: boolean;
}

export interface PdfLayoutOptions {
  paperSize: PdfPaperSize;
  orientation: PdfOrientation;
  baseFontSize: number;
  marginMm: number;
  includeItunesLinks: boolean;
  autoFitOnePage: boolean;
  density: PdfDensity;
  header: PdfHeaderOptions;
  hiddenBlockIds: string[];
  blockLabelOverrides: Record<string, string>;
}

export const DEFAULT_PDF_OPTIONS: PdfLayoutOptions = {
  paperSize: 'A4',
  orientation: 'LANDSCAPE',
  baseFontSize: 9,
  marginMm: 10,
  includeItunesLinks: true,
  autoFitOnePage: true,
  density: 'COMFORTABLE',
  header: {
    showTenantName: true,
    showLiveName: true,
    showLiveDate: true,
    showLiveLocation: true,
    showRecordLabel: true,
    showSubmittedAt: true,
    showSubmissionStatus: false,
  },
  hiddenBlockIds: [],
  blockLabelOverrides: {},
};

export const PDF_PAPER_SIZE_OPTIONS: Array<{ value: PdfPaperSize; label: string; description: string }> = [
  { value: 'A4', label: 'A4', description: '210 × 297 mm' },
  { value: 'A3', label: 'A3', description: '297 × 420 mm' },
  { value: 'A5', label: 'A5', description: '148 × 210 mm' },
  { value: 'B4', label: 'B4', description: '257 × 364 mm' },
  { value: 'B5', label: 'B5', description: '182 × 257 mm' },
  { value: 'LETTER', label: 'Letter', description: '216 × 279 mm' },
];

export const PDF_ORIENTATION_OPTIONS: Array<{ value: PdfOrientation; label: string }> = [
  { value: 'LANDSCAPE', label: '横' },
  { value: 'PORTRAIT', label: '縦' },
];

export const PDF_DENSITY_OPTIONS: Array<{ value: PdfDensity; label: string }> = [
  { value: 'COMPACT', label: '密' },
  { value: 'COMFORTABLE', label: '標準' },
  { value: 'SPACIOUS', label: '広' },
];

export const PDF_HEADER_FIELD_OPTIONS: Array<{ key: keyof PdfHeaderOptions; label: string }> = [
  { key: 'showTenantName', label: 'テナント名' },
  { key: 'showLiveName', label: 'ライブ名' },
  { key: 'showLiveDate', label: '日付' },
  { key: 'showLiveLocation', label: '会場' },
  { key: 'showRecordLabel', label: 'バンド名' },
  { key: 'showSubmittedAt', label: '提出日時' },
  { key: 'showSubmissionStatus', label: '提出状況' },
];
