/** 囲んだ範囲の罫線から表の行と列を読み取り、表の要素を作る。座標はすべて mm。 */
import type { TableColumn } from '../../pdf/canvas-schema';
import { defaultColumn, newId } from '../venue-element-factory';
import { DEFAULT_TEXT_COLOR, type VenueTableElement } from '../venue-form-schema';
import { fontSizeForHeight } from './cell-fit';
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
/** 行の高さの差がこれを超えたら「揃っていない」とみなす。 */
const UNEVEN_MM = 1;
const MAX_TABLE_FONT_PT = 9;

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

export function isUneven(rows: number[]) {
  const heights = rows.slice(1).map((y, i) => y - rows[i]);
  return Math.max(...heights) - Math.min(...heights) > UNEVEN_MM;
}

export interface TableOptions {
  groupId: string;
  /** 上から何行を見出しとして飛ばすか */
  headerRows: number;
  /** 何件目から書くか（1 始まり） */
  startIndex: number;
  /** 列ごとの項目（'' は空欄の列、'__index__' は番号） */
  fieldIds: string[];
}

/** 見出しを除いた行の範囲を表の枠にする。行の高さは等分（揃っていない表は平均の高さになる）。 */
export function buildTableElement(grid: TableGrid, options: TableOptions, pageId: string): VenueTableElement {
  const rows = grid.rows.slice(Math.min(options.headerRows, grid.rows.length - 2));
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const maxRows = rows.length - 1;
  const left = grid.cols[0];
  const width = grid.cols[grid.cols.length - 1] - left;
  const columns: TableColumn[] = grid.cols.slice(1).map((x, i) => {
    const fieldId = options.fieldIds[i] ?? '';
    return defaultColumn(fieldId, (x - grid.cols[i]) / width, fieldId === '__index__' ? 'center' : 'left');
  });
  return {
    id: newId(),
    pageId,
    kind: 'table',
    xMm: round2(left),
    yMm: round2(top),
    wMm: round2(width),
    hMm: round2(bottom - top),
    groupId: options.groupId,
    columns,
    startIndex: Math.max(1, options.startIndex),
    maxRows,
    fontSizePt: Math.min(MAX_TABLE_FONT_PT, fontSizeForHeight((bottom - top) / maxRows)),
    color: DEFAULT_TEXT_COLOR,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
