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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
