/** 書式の要素とページを、既定値を入れて作る。 */
import type { TableColumn } from './table-schema';
import { getPaperDimensions } from './paper';
import {
  DEFAULT_MARK_COLOR,
  DEFAULT_TEXT_COLOR,
  type VenueAsset,
  type VenueElement,
  type VenuePage,
} from './venue-form-schema';
import type { IconNode } from '@/features/stage-plot/stage-plot-types';

export function newId(): string {
  return crypto.randomUUID();
}

/** パレットから要素を置くときの種類ごとの追加情報。 */
export type ElementInsert =
  | { kind: 'text'; content?: string }
  | { kind: 'field'; fieldId: string }
  | { kind: 'table'; groupId: string }
  | { kind: 'grid'; groupId: string | null; groupLabel?: string }
  | { kind: 'icon'; iconName: string; nodes: IconNode[] }
  | { kind: 'shape'; shape: 'ellipse' | 'rect' | 'line' }
  | { kind: 'stagePlot'; fieldId: string; groupId?: string | null };

export function createElement(insert: ElementInsert, pageId: string, at: { xMm: number; yMm: number }): VenueElement {
  const base = { id: newId(), pageId, xMm: at.xMm, yMm: at.yMm };
  switch (insert.kind) {
    case 'text':
      return { ...base, kind: 'text', wMm: 50, hMm: 7, content: insert.content ?? 'テキスト', fontSizePt: 10, align: 'left', verticalAlign: 'middle', color: DEFAULT_TEXT_COLOR };
    case 'field':
      return { ...base, kind: 'field', wMm: 50, hMm: 7, fieldId: insert.fieldId, fontSizePt: 10, align: 'left', verticalAlign: 'middle', color: DEFAULT_TEXT_COLOR };
    case 'table':
      return {
        ...base,
        kind: 'table',
        wMm: 120,
        hMm: 40,
        groupId: insert.groupId,
        columns: [defaultColumn('__index__', 0.15, 'center'), defaultColumn('', 0.85, 'left')],
        startIndex: 1,
        maxRows: 5,
        fontSizePt: 9,
        color: DEFAULT_TEXT_COLOR,
      };
    case 'grid':
      return {
        ...base,
        kind: 'grid',
        wMm: 150,
        hMm: 30,
        source: insert.groupId
          ? { kind: 'group', groupId: insert.groupId, fallbackLabel: insert.groupLabel }
          : { kind: 'fields', fields: [] },
        columns: insert.groupId
          ? [{ ...defaultColumn('__index__', 0.1, 'center'), header: 'No' }, { ...defaultColumn('', 0.9, 'left'), shrinkToFit: false }]
          : [{ ...defaultColumn('__label__', 0.3, 'left'), header: '項目', shrinkToFit: false }, { ...defaultColumn('', 0.7, 'left'), header: '内容', shrinkToFit: false }],
        showHeader: true,
        fontSizePt: 9,
        headerFill: '#e5edf6',
        borderColor: '#d1d5db',
        autoGrow: true,
      };
    case 'icon':
      return { ...base, kind: 'icon', wMm: 5, hMm: 5, iconName: insert.iconName, nodes: insert.nodes, color: DEFAULT_MARK_COLOR, strokeWidth: 2.5 };
    case 'shape':
      return insert.shape === 'line'
        ? { ...base, kind: 'shape', wMm: 20, hMm: 3, shape: 'line', strokeColor: DEFAULT_MARK_COLOR, strokeWidthPt: 1 }
        : { ...base, kind: 'shape', wMm: 12, hMm: 6, shape: insert.shape, strokeColor: DEFAULT_MARK_COLOR, strokeWidthPt: 1 };
    case 'stagePlot':
      return {
        ...base,
        kind: 'stagePlot',
        wMm: 120,
        hMm: 75,
        fieldId: insert.fieldId,
        groupId: insert.groupId ?? null,
        itemIndex: insert.groupId ? 1 : null,
        mode: 'icons',
        labelFontSizePt: 7,
      };
  }
}

export function defaultColumn(fieldId: string, widthRatio: number, align: 'left' | 'center' | 'right'): TableColumn {
  return { id: newId(), header: '', fieldId, widthRatio, align, shrinkToFit: true };
}

/**
 * 背景ファイルのページから書式のページを作る。PDF はそのページの大きさ、
 * 画像は A4 にして、横長の画像なら横向きにする（画像は縦横比を保ってページに収める）。
 */
export function createPageFromAsset(asset: VenueAsset, pageIndex: number): VenuePage {
  const meta = asset.pages[pageIndex];
  if (meta?.widthMm && meta.heightMm) {
    return { id: newId(), widthMm: meta.widthMm, heightMm: meta.heightMm, background: { assetId: asset.id, pageIndex } };
  }
  const landscape = (meta?.widthPx ?? 0) > (meta?.heightPx ?? 0);
  const { widthMm, heightMm } = getPaperDimensions('A4', landscape ? 'LANDSCAPE' : 'PORTRAIT');
  return { id: newId(), widthMm, heightMm, background: { assetId: asset.id, pageIndex } };
}

/** 背景の無い白紙のページ（A4 縦）。余白は伸びる表が次のページへ続くときに使う。 */
export function createBlankPage(): VenuePage {
  const { widthMm, heightMm } = getPaperDimensions('A4', 'PORTRAIT');
  return { id: newId(), widthMm, heightMm, background: null, marginMm: 10 };
}
