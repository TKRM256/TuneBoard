/** 白紙のページに使う用紙の大きさ。 */

export type PaperSize = 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'LETTER';
export type Orientation = 'PORTRAIT' | 'LANDSCAPE';

export const PAPER_SIZE_OPTIONS: Array<{ value: PaperSize; label: string; widthMm: number; heightMm: number }> = [
  { value: 'A3', label: 'A3', widthMm: 297, heightMm: 420 },
  { value: 'A4', label: 'A4', widthMm: 210, heightMm: 297 },
  { value: 'A5', label: 'A5', widthMm: 148, heightMm: 210 },
  { value: 'B4', label: 'B4', widthMm: 257, heightMm: 364 },
  { value: 'B5', label: 'B5', widthMm: 182, heightMm: 257 },
  { value: 'LETTER', label: 'Letter', widthMm: 216, heightMm: 279 },
];

export const ORIENTATION_OPTIONS: Array<{ value: Orientation; label: string }> = [
  { value: 'LANDSCAPE', label: '横' },
  { value: 'PORTRAIT', label: '縦' },
];

export function getPaperDimensions(size: PaperSize, orientation: Orientation): { widthMm: number; heightMm: number } {
  const opt = PAPER_SIZE_OPTIONS.find((o) => o.value === size) ?? PAPER_SIZE_OPTIONS[1];
  return orientation === 'LANDSCAPE'
    ? { widthMm: opt.heightMm, heightMm: opt.widthMm }
    : { widthMm: opt.widthMm, heightMm: opt.heightMm };
}
