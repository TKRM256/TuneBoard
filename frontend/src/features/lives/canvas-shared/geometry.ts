/** mm 座標で置く要素の整列・等間隔配置。PDF キャンバスと会場書式の両方で使う。 */

export interface MmBox {
  id: string;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
}

export type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

export type BoxPatch = Partial<Pick<MmBox, 'xMm' | 'yMm'>>;

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function computeAlignment(sel: MmBox[], mode: AlignMode): Map<string, BoxPatch> {
  const out = new Map<string, BoxPatch>();
  if (sel.length === 0) return out;
  const minX = Math.min(...sel.map((e) => e.xMm));
  const minY = Math.min(...sel.map((e) => e.yMm));
  const maxRight = Math.max(...sel.map((e) => e.xMm + e.wMm));
  const maxBottom = Math.max(...sel.map((e) => e.yMm + e.hMm));
  const centerX = (minX + maxRight) / 2;
  const centerY = (minY + maxBottom) / 2;
  for (const e of sel) {
    switch (mode) {
      case 'left': out.set(e.id, { xMm: minX }); break;
      case 'right': out.set(e.id, { xMm: maxRight - e.wMm }); break;
      case 'center-h': out.set(e.id, { xMm: centerX - e.wMm / 2 }); break;
      case 'top': out.set(e.id, { yMm: minY }); break;
      case 'bottom': out.set(e.id, { yMm: maxBottom - e.hMm }); break;
      case 'center-v': out.set(e.id, { yMm: centerY - e.hMm / 2 }); break;
    }
  }
  return out;
}

export function computeDistribution(sel: MmBox[], axis: 'horizontal' | 'vertical'): Map<string, BoxPatch> {
  const out = new Map<string, BoxPatch>();
  if (sel.length < 3) return out;
  const sorted = [...sel].sort((a, b) => axis === 'horizontal' ? a.xMm - b.xMm : a.yMm - b.yMm);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (axis === 'horizontal') {
    const span = (last.xMm + last.wMm) - first.xMm;
    const totalWidths = sorted.reduce((s, e) => s + e.wMm, 0);
    const gap = (span - totalWidths) / (sorted.length - 1);
    let cursor = first.xMm;
    for (const e of sorted) {
      out.set(e.id, { xMm: round1(cursor) });
      cursor += e.wMm + gap;
    }
  } else {
    const span = (last.yMm + last.hMm) - first.yMm;
    const totalHeights = sorted.reduce((s, e) => s + e.hMm, 0);
    const gap = (span - totalHeights) / (sorted.length - 1);
    let cursor = first.yMm;
    for (const e of sorted) {
      out.set(e.id, { yMm: round1(cursor) });
      cursor += e.hMm + gap;
    }
  }
  return out;
}

/** 選択した要素がページからはみ出さない範囲に移動量を抑える。 */
export function clampMove(
  boxes: MmBox[],
  dxMm: number,
  dyMm: number,
  pageWidthMm: number,
  pageHeightMm: number,
): { dx: number; dy: number } {
  let dx = dxMm;
  let dy = dyMm;
  for (const e of boxes) {
    if (e.xMm + dx < 0) dx = -e.xMm;
    if (e.yMm + dy < 0) dy = -e.yMm;
    if (e.xMm + e.wMm + dx > pageWidthMm) dx = pageWidthMm - e.xMm - e.wMm;
    if (e.yMm + e.hMm + dy > pageHeightMm) dy = pageHeightMm - e.yMm - e.hMm;
  }
  return { dx, dy };
}
