/** TypeScript twin of the backend `CanvasSchema` records. Keep in sync. */

export type PaperSize = 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'LETTER';
export type Orientation = 'PORTRAIT' | 'LANDSCAPE';
export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export interface CanvasPage {
  size: PaperSize;
  orientation: Orientation;
  marginMm: number;
  baseFontSizePt: number;
}

interface BaseElement {
  id: string;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
}

export interface TextElement extends BaseElement {
  kind: 'text';
  content: string;
  fontSizePt: number;
  bold?: boolean;
  italic?: boolean;
  align?: HAlign;
  verticalAlign?: VAlign;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderThicknessPt?: number;
}

export interface FieldElement extends BaseElement {
  kind: 'field';
  fieldId: string;
  fallbackLabel?: string;
  showLabel?: boolean;
  labelOverride?: string;
  fontSizePt: number;
  bold?: boolean;
  align?: HAlign;
  verticalAlign?: VAlign;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderThicknessPt?: number;
}

export interface DividerElement extends BaseElement {
  kind: 'divider';
  color?: string;
  thicknessPt?: number;
}

export interface SpacerElement extends BaseElement {
  kind: 'spacer';
}

export type TableSource =
  | { kind: 'group'; groupId: string; fallbackLabel?: string }
  | { kind: 'fields'; fields: Array<{ fieldId: string; fallbackLabel?: string }> };

export interface TableColumn {
  id: string;
  header: string;
  /** Field id from the form, or `__index__` (group rows) / `__label__` (fields rows). */
  fieldId: string;
  widthRatio: number;
  align?: HAlign;
  format?: string;
  /** 列幅に収まらないセルを折り返す代わりに文字を縮める。 */
  shrinkToFit?: boolean;
  /** 上の縮小の下限。既定 6pt。ここまで縮めても収まらない分は折り返す。 */
  minFontSizePt?: number;
}

export interface TableElement extends BaseElement {
  kind: 'table';
  source: TableSource;
  columns: TableColumn[];
  showHeader?: boolean;
  fontSizePt: number;
  headerFill?: string;
  borderColor?: string;
  zebra?: boolean;
  /**
   * 既定 true。行が入り切らないときに下方向へ伸び、下の要素を押し下げ、
   * ページに収まらなくなったら次ページに続きを出す。このとき hMm は最低高さになる。
   */
  autoGrow?: boolean;
}

export const DEFAULT_MIN_FONT_SIZE_PT = 6;

export type CanvasElement = TextElement | FieldElement | DividerElement | SpacerElement | TableElement;

export interface CanvasDocument {
  page: CanvasPage;
  elements: CanvasElement[];
}

export const PAPER_SIZE_OPTIONS: Array<{ value: PaperSize; label: string; widthMm: number; heightMm: number }> = [
  { value: 'A3', label: 'A3', widthMm: 297, heightMm: 420 },
  { value: 'A4', label: 'A4', widthMm: 210, heightMm: 297 },
  { value: 'A5', label: 'A5', widthMm: 148, heightMm: 210 },
  { value: 'B4', label: 'B4 (JIS)', widthMm: 257, heightMm: 364 },
  { value: 'B5', label: 'B5 (JIS)', widthMm: 182, heightMm: 257 },
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

export function elementKindLabel(kind: CanvasElement['kind']): string {
  switch (kind) {
    case 'text': return 'テキスト';
    case 'field': return 'フィールド';
    case 'divider': return '区切り線';
    case 'spacer': return 'スペーサー';
    case 'table': return '表';
  }
}
