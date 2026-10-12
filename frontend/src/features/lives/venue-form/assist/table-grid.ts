/** 囲んだ範囲の罫線から表の行と列を読み取り、マスごとに項目の値を書くテキストを作る。座標はすべて mm。 */
import { createElement } from '../venue-element-factory';
import type { VenueTextElement } from '../venue-form-schema';
import { fontSizeForHeight, innerBox } from './cell-fit';
import type { PageLine } from './ruled-lines';

export interface Region {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** 行の境目（y）と列の境目（x）。どちらも小さい順で、両端を含む。 */
export interface TableGrid {
  rows: number[];
  cols: number[];
}

/** 囲んだ範囲から少しはみ出した線も、その表の線とみなす。 */
const TOLERANCE_MM = 1.5;
/** これより近い境目は 1 本とみなす（二重線など）。 */
const MERGE_MM = 0.8;
const MAX_FONT_PT = 9;
/** 列の項目に選べる「番号（何件目か）」 */
export const INDEX_FIELD = '__index__';

function overlap(fromA: number, toA: number, fromB: number, toB: number) {
  return Math.max(0, Math.min(toA, toB) - Math.max(fromA, fromB));
}

function dedupe(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const value of sorted) {
    if (out.length === 0 || value - out[out.length - 1] > MERGE_MM) out.push(value);
  }
  return out;
}

/** 範囲の中を横切る線（範囲の幅・高さの半分以上にかかるもの）を境目にする。横線が 2 本未満なら表にできない。 */
export function detectGrid(region: Region, lines: PageLine[]): TableGrid | null {
  const width = region.right - region.left;
  const height = region.bottom - region.top;
  const horizontal = lines.filter((line) => line.axis === 'h'
    && line.posMm >= region.top - TOLERANCE_MM && line.posMm <= region.bottom + TOLERANCE_MM
    && overlap(line.fromMm, line.toMm, region.left, region.right) >= width / 2);
  const rows = dedupe(horizontal.map((line) => line.posMm));
  if (rows.length < 2) return null;

  const vertical = lines.filter((line) => line.axis === 'v'
    && line.posMm >= region.left - TOLERANCE_MM && line.posMm <= region.right + TOLERANCE_MM
    && overlap(line.fromMm, line.toMm, region.top, region.bottom) >= height / 2);
  // 外側の縦線が無い表（下線だけの行など）は、横線の端（範囲の中に収める）を両端にする
  const left = Math.max(region.left, Math.min(...horizontal.map((line) => line.fromMm)));
  const right = Math.min(region.right, Math.max(...horizontal.map((line) => line.toMm)));
  const inner = vertical.map((line) => line.posMm);
  const cols = dedupe([
    ...(inner.some((x) => Math.abs(x - left) <= TOLERANCE_MM) ? [] : [left]),
    ...inner,
    ...(inner.some((x) => Math.abs(x - right) <= TOLERANCE_MM) ? [] : [right]),
  ]);
  return cols.length >= 2 ? { rows, cols } : null;
}

export interface TableOptions {
  groupId: string;
  /** 上から何行を見出しとして飛ばすか */
  headerRows: number;
  /** 何件目から書くか（1 始まり） */
  startIndex: number;
  /** 列ごとの項目（'' は何も書かない列、INDEX_FIELD は番号） */
  fieldIds: string[];
}

/** 何件目（0 始まり）の、その項目の値を書く式。 */
export function itemValueExpression(groupId: string, index: number, fieldId: string) {
  return `\${groups['${groupId}'].items[${index}].field('${fieldId}').value}`;
}

/**
 * 見出しを除いた行・列のマスごとに、何件目の項目の値を書くテキストを作る。マスは罫線どおりの位置なので、
 * 行の高さが揃っていない表でもずれない。番号の列は、その件があるときだけ番号を書く。
 * 文字の大きさはいちばん低い行に収まる大きさで揃える。
 */
export function buildCellTexts(grid: TableGrid, options: TableOptions, pageId: string): VenueTextElement[] {
  const rows = grid.rows.slice(Math.min(options.headerRows, grid.rows.length - 2));
  const heights = rows.slice(1).map((y, i) => y - rows[i]);
  const fontSizePt = Math.min(MAX_FONT_PT, fontSizeForHeight(Math.min(...heights)));
  const first = Math.max(1, options.startIndex) - 1;
  const texts: VenueTextElement[] = [];
  heights.forEach((_, r) => {
    const index = first + r;
    grid.cols.slice(1).forEach((right, c) => {
      const fieldId = options.fieldIds[c] ?? '';
      if (!fieldId) return;
      const isNumber = fieldId === INDEX_FIELD;
      const box = innerBox({ left: grid.cols[c], right, top: rows[r], bottom: rows[r + 1] });
      texts.push({
        ...(createElement({ kind: 'text' }, pageId, box) as VenueTextElement),
        ...box,
        content: isNumber ? String(index + 1) : itemValueExpression(options.groupId, index, fieldId),
        condition: isNumber ? `\${count(groups['${options.groupId}'].items) >= ${index + 1}}` : undefined,
        fontSizePt,
        align: isNumber ? 'center' : 'left',
      });
    });
  });
  return texts;
}
