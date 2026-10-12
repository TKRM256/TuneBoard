/** 何もないところからドラッグして、四角で囲んだ要素をまとめて選ぶ。Shift を押していれば今の選択に足す。 */
import { useState, type PointerEvent } from 'react';

import type { MmBox } from './geometry';
import type { SnapBox } from './snapping';

/** これより小さいドラッグはクリックとみなす（画面上のピクセル） */
const CLICK_PX = 4;
const EPS = 0.01;

/** 四角の中にすっかり入っている要素。 */
export function idsInRect(elements: MmBox[], rect: SnapBox): string[] {
  return elements
    .filter((element) => element.xMm >= rect.xMm - EPS
      && element.yMm >= rect.yMm - EPS
      && element.xMm + element.wMm <= rect.xMm + rect.wMm + EPS
      && element.yMm + element.hMm <= rect.yMm + rect.hMm + EPS)
    .map((element) => element.id);
}

interface Options {
  elements: MmBox[];
  pxPerMm: number;
  onSelect: (id: string | null, additive: boolean) => void;
  onSelectMany: (ids: string[], additive: boolean) => void;
}

interface Drag {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  additive: boolean;
}

export function useMarqueeSelect({ elements, pxPerMm, onSelect, onSelectMany }: Options) {
  const [drag, setDrag] = useState<Drag | null>(null);

  const toMm = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / pxPerMm, y: (event.clientY - rect.top) / pxPerMm };
  };

  const rectOf = (d: Drag): SnapBox => ({
    xMm: Math.min(d.x0, d.x1),
    yMm: Math.min(d.y0, d.y1),
    wMm: Math.abs(d.x1 - d.x0),
    hMm: Math.abs(d.y1 - d.y0),
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // 要素や操作用のレイヤーの上では始めない
    if (event.target !== event.currentTarget || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = toMm(event);
    setDrag({ x0: x, y0: y, x1: x, y1: y, additive: event.shiftKey });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const { x, y } = toMm(event);
    setDrag({ ...drag, x1: x, y1: y });
  };

  const onPointerUp = () => {
    if (!drag) return;
    setDrag(null);
    const rect = rectOf(drag);
    if (rect.wMm * pxPerMm < CLICK_PX && rect.hMm * pxPerMm < CLICK_PX) {
      if (!drag.additive) onSelect(null, false);
      return;
    }
    onSelectMany(idsInRect(elements, rect), drag.additive);
  };

  return {
    /** 囲んでいる途中の四角（mm）。囲んでいなければ null */
    rect: drag ? rectOf(drag) : null,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => setDrag(null) },
  };
}
