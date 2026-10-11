/** 背景から検出した罫線を、ページ上の mm の座標に直す。 */
import type { SnapLine } from '../../canvas-shared/snapping';
import type { VenueAsset, VenuePage } from '../venue-form-schema';

/** サーバーが返す罫線。座標は背景（ページの画像全体）に対する比率（0〜1、左上が原点）。 */
export interface RuledLine {
  axis: 'h' | 'v';
  pos: number;
  from: number;
  to: number;
}

/** ページ上の罫線（mm）。吸着の相手としてそのまま使う。 */
export type PageLine = SnapLine;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 背景の縦横比（幅 / 高さ）。分からなければ null。 */
export function backgroundAspect(page: VenuePage, assets: VenueAsset[]): number | null {
  const background = page.background;
  if (!background) return null;
  const meta = assets.find((asset) => asset.id === background.assetId)?.pages[background.pageIndex];
  if (!meta) return null;
  const width = meta.widthMm ?? meta.widthPx;
  const height = meta.heightMm ?? meta.heightPx;
  return width && height ? width / height : null;
}

/** 背景は縦横比を保ってページの中央に収める（出力・エディタの表示と同じ）。 */
export function fittedBackgroundRect(page: Pick<VenuePage, 'widthMm' | 'heightMm'>, aspect: number): Rect {
  const scale = Math.min(page.widthMm / aspect, page.heightMm);
  const w = aspect * scale;
  const h = scale;
  return { x: (page.widthMm - w) / 2, y: (page.heightMm - h) / 2, w, h };
}

export function toPageLines(lines: RuledLine[], page: Pick<VenuePage, 'widthMm' | 'heightMm'>, aspect: number): PageLine[] {
  const rect = fittedBackgroundRect(page, aspect);
  return lines.map((line) => line.axis === 'h'
    ? { axis: 'h', posMm: rect.y + line.pos * rect.h, fromMm: rect.x + line.from * rect.w, toMm: rect.x + line.to * rect.w }
    : { axis: 'v', posMm: rect.x + line.pos * rect.w, fromMm: rect.y + line.from * rect.h, toMm: rect.y + line.to * rect.h });
}
