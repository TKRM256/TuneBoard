/** 用紙の大きさを替えたとき、そのページの要素を新しい用紙に合わせて縮める（広げる）。
 *  位置と大きさは縦横それぞれの比で、文字は小さいほうの比で変える。 */
import type { VenueElement, VenueFormDocument } from './venue-form-schema';

const MIN_FONT_SIZE_PT = 4;

export function resizePage(doc: VenueFormDocument, pageId: string, size: { widthMm: number; heightMm: number }): VenueFormDocument {
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  if (!page) return doc;
  const scaleX = size.widthMm / page.widthMm;
  const scaleY = size.heightMm / page.heightMm;
  const fontScale = Math.min(scaleX, scaleY);
  return {
    pages: doc.pages.map((candidate) => (candidate.id === pageId ? { ...candidate, ...size } : candidate)),
    elements: doc.elements.map((element) => (element.pageId === pageId ? scaleElement(element, scaleX, scaleY, fontScale) : element)),
  };
}

/** すべてのページを同じ用紙の大きさにそろえる（テンプレートを今の用紙に合わせるとき）。 */
export function fitAllPages(doc: VenueFormDocument, size: { widthMm: number; heightMm: number }): VenueFormDocument {
  return doc.pages.reduce((next, page) => resizePage(next, page.id, size), doc);
}

function scaleElement(element: VenueElement, scaleX: number, scaleY: number, fontScale: number): VenueElement {
  const box = {
    xMm: round2(element.xMm * scaleX),
    yMm: round2(element.yMm * scaleY),
    wMm: round2(element.wMm * scaleX),
    hMm: round2(element.hMm * scaleY),
  };
  if (element.kind === 'icon' || element.kind === 'shape') return { ...element, ...box };
  if (element.kind === 'stagePlot') {
    return element.labelFontSizePt === undefined ? { ...element, ...box } : { ...element, ...box, labelFontSizePt: scaleFont(element.labelFontSizePt, fontScale) };
  }
  return { ...element, ...box, fontSizePt: scaleFont(element.fontSizePt, fontScale) };
}

/** 0.5pt 刻みにそろえる。 */
function scaleFont(sizePt: number, scale: number) {
  return Math.max(MIN_FONT_SIZE_PT, Math.round(sizePt * scale * 2) / 2);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
