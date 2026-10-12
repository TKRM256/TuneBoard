/** 要素を、それがある罫線の枠いっぱいに広げる（ダブルクリック）。座標はすべて mm。 */
import type { SnapBox } from '../../canvas-shared/snapping';
import type { VenueElement } from '../venue-form-schema';
import type { PageLine } from './ruled-lines';

const PADDING_MM = 0.5;
/** 短い辺がこれより小さい枠は余白なしで広げる。 */
const SMALL_CELL_MM = 5;
const MIN_CELL_MM = 1;
const PT_PER_MM = 72 / 25.4;
/** 1 行の高さは文字の大きさのこの倍とみなす。 */
const LINE_HEIGHT = 1.25;
const MIN_FONT_PT = 5;
const MAX_FONT_PT = 14;
/** 線の上にちょうど乗っている点は、その線の内側とはみなさない。 */
const EPS = 0.05;

export interface Cell {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function covers(line: PageLine, value: number) {
  return line.fromMm - EPS <= value && value <= line.toMm + EPS;
}

/**
 * 点を囲むいちばん小さい枠。上下の線は必須。左右の線が無ければ（下線だけの欄など）、
 * 下の線（無ければ上の線）の端までを枠とみなす。
 */
export function findCell(x: number, y: number, lines: PageLine[]): Cell | null {
  let top: PageLine | null = null;
  let bottom: PageLine | null = null;
  let left: PageLine | null = null;
  let right: PageLine | null = null;
  for (const line of lines) {
    if (line.axis === 'h' && covers(line, x)) {
      if (line.posMm < y - EPS && (!top || line.posMm > top.posMm)) top = line;
      if (line.posMm > y + EPS && (!bottom || line.posMm < bottom.posMm)) bottom = line;
    } else if (line.axis === 'v' && covers(line, y)) {
      if (line.posMm < x - EPS && (!left || line.posMm > left.posMm)) left = line;
      if (line.posMm > x + EPS && (!right || line.posMm < right.posMm)) right = line;
    }
  }
  if (!top || !bottom) return null;
  const edge = bottom;
  const cell = {
    left: left?.posMm ?? edge.fromMm,
    right: right?.posMm ?? edge.toMm,
    top: top.posMm,
    bottom: bottom.posMm,
  };
  return cell.right - cell.left >= MIN_CELL_MM && cell.bottom - cell.top >= MIN_CELL_MM ? cell : null;
}

/** 枠の内側の箱。小さい枠は余白なし。 */
export function innerBox(cell: Cell): SnapBox {
  const width = cell.right - cell.left;
  const height = cell.bottom - cell.top;
  const padding = Math.min(width, height) < SMALL_CELL_MM ? 0 : PADDING_MM;
  return {
    xMm: round2(cell.left + padding),
    yMm: round2(cell.top + padding),
    wMm: round2(width - padding * 2),
    hMm: round2(height - padding * 2),
  };
}

/** 高さに 1 行が収まる文字の大きさ（pt）。 */
export function fontSizeForHeight(heightMm: number) {
  const pt = (heightMm * PT_PER_MM) / LINE_HEIGHT;
  return Math.round(Math.min(MAX_FONT_PT, Math.max(MIN_FONT_PT, pt)) * 2) / 2;
}

/** 要素を枠いっぱいにする変更。枠が見つからなければ null。文字の大きさは変えない。 */
export function fitToCell(element: VenueElement, lines: PageLine[]): SnapBox | null {
  const cell = findCell(element.xMm + element.wMm / 2, element.yMm + element.hMm / 2, lines);
  return cell ? innerBox(cell) : null;
}

/** すぐ下の枠を探すとき、今の枠の下の線からこれだけ下の点を使う。 */
const NEXT_ROW_PROBE_MM = 1;
/** 下の枠の左右の端が今の枠とこれ以上ずれていれば、同じ表の次の行とはみなさない。 */
const SAME_COLUMN_MM = 1.5;

/**
 * 要素がある枠のすぐ下の枠に移した箱（次の件として貼り付けるとき）。枠の中での上下の余白は保ち、
 * 横の位置と幅はそのまま。今の枠か、左右の端がそろった下の枠（同じ表の次の行）が無ければ null。
 */
export function boxInNextRow(box: SnapBox, lines: PageLine[]): SnapBox | null {
  const x = box.xMm + box.wMm / 2;
  const cell = findCell(x, box.yMm + box.hMm / 2, lines);
  const next = cell ? findCell(x, cell.bottom + NEXT_ROW_PROBE_MM, lines) : null;
  if (!cell || !next) return null;
  if (Math.abs(next.left - cell.left) > SAME_COLUMN_MM || Math.abs(next.right - cell.right) > SAME_COLUMN_MM) return null;
  const top = next.top + (box.yMm - cell.top);
  const bottom = next.bottom - (cell.bottom - (box.yMm + box.hMm));
  return { xMm: box.xMm, yMm: round2(top), wMm: box.wMm, hMm: round2(Math.max(MIN_CELL_MM, bottom - top)) };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
