/**
 * PDF 書式のレイアウト。バックエンドの VenueFormSchema と同じ形にする。座標は各ページ左上を原点とした mm。
 * 会場の書式を背景に敷いたページも、白紙のページも同じ形で表す。
 */
import type { HAlign, TableColumn, TableSource, VAlign } from './table-schema';
import type { IconNode } from '@/features/stage-plot/stage-plot-types';

export interface PageBackground {
  assetId: string;
  pageIndex: number;
}

export interface VenuePage {
  id: string;
  widthMm: number;
  heightMm: number;
  background: PageBackground | null;
  /** 伸びる表が次のページへ続くときの上下の余白。空なら 10mm */
  marginMm?: number | null;
}

interface BaseElement {
  id: string;
  pageId: string;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  /** JEXL の表示条件（`${...}`）。空なら常に描く。 */
  condition?: string;
}

/** テキストと項目に共通の、枠の背景と線。 */
interface BoxStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderThicknessPt?: number;
}

export interface VenueTextElement extends BaseElement, BoxStyle {
  kind: 'text';
  content: string;
  fontSizePt: number;
  bold?: boolean;
  align?: HAlign;
  verticalAlign?: VAlign;
  color?: string;
  /** 折り返さずに 1 行で枠の幅に収まるまで文字を小さくする */
  shrinkToFit?: boolean;
}

export interface VenueFieldElement extends BaseElement, BoxStyle {
  kind: 'field';
  fieldId: string;
  fontSizePt: number;
  bold?: boolean;
  align?: HAlign;
  verticalAlign?: VAlign;
  color?: string;
  /** 折り返さずに 1 行で枠の幅に収まるまで文字を小さくする */
  shrinkToFit?: boolean;
  /** 「氏名: 田中」のように項目名を前に付ける。名前は labelOverride、空ならフォームの項目名 */
  showLabel?: boolean;
  labelOverride?: string;
}

/** グループの回答を行ごとに書く。枠線や見出しは書式側にあるので描かない。行の高さは hMm / maxRows。 */
export interface VenueTableElement extends BaseElement {
  kind: 'table';
  groupId: string;
  columns: TableColumn[];
  /** 何件目から書くか（1 始まり） */
  startIndex: number;
  maxRows: number;
  fontSizePt: number;
  color?: string;
}

/** 罫線と見出しのある表。行の高さは中身に合わせて決まる。 */
export interface VenueGridElement extends BaseElement {
  kind: 'grid';
  source: TableSource;
  columns: TableColumn[];
  showHeader?: boolean;
  fontSizePt: number;
  headerFill?: string;
  borderColor?: string;
  zebra?: boolean;
  /** false 以外なら、行が枠に入りきらないときに下へ伸び、下の要素を押し下げ、入らない分は次のページに続ける。hMm は最低の高さになる */
  autoGrow?: boolean;
}

export interface VenueIconElement extends BaseElement {
  kind: 'icon';
  iconName: string;
  nodes: IconNode[];
  color?: string;
  strokeWidth?: number;
}

export type ShapeKind = 'ellipse' | 'rect' | 'line';

export interface VenueShapeElement extends BaseElement {
  kind: 'shape';
  shape: ShapeKind;
  strokeColor?: string;
  strokeWidthPt?: number;
  fillColor?: string;
}

export type StagePlotMode = 'icons' | 'withBase';

export interface VenueStagePlotElement extends BaseElement {
  kind: 'stagePlot';
  fieldId: string;
  /** グループ内の配置図なら、そのグループと何件目か（1 始まり） */
  groupId?: string | null;
  itemIndex?: number | null;
  mode: StagePlotMode;
  labelFontSizePt?: number;
}

export type VenueElement =
  | VenueTextElement
  | VenueFieldElement
  | VenueTableElement
  | VenueGridElement
  | VenueIconElement
  | VenueShapeElement
  | VenueStagePlotElement;

export type VenueElementKind = VenueElement['kind'];

export interface VenueFormDocument {
  pages: VenuePage[];
  elements: VenueElement[];
}

export interface VenueAssetPage {
  widthMm: number | null;
  heightMm: number | null;
  widthPx: number | null;
  heightPx: number | null;
}

export interface VenueAsset {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  pages: VenueAssetPage[];
}

export const DEFAULT_TEXT_COLOR = '#111827';
export const DEFAULT_MARK_COLOR = '#dc2626';

export function emptyVenueForm(): VenueFormDocument {
  return { pages: [], elements: [] };
}

export function venueElementKindLabel(kind: VenueElementKind): string {
  switch (kind) {
    case 'text': return 'テキスト';
    case 'field': return '項目';
    case 'table': return '欄に書く表';
    case 'grid': return '表';
    case 'icon': return 'アイコン';
    case 'shape': return '図形';
    case 'stagePlot': return '配置図';
  }
}
