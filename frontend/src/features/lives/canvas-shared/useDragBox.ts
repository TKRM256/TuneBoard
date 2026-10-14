/** ポインタでドラッグした範囲（mm）を追う。離した位置は離したときのイベントから取るので、
 *  最後の移動が描き終わる前に離しても（すばやいドラッグ）範囲がずれない。 */
import { useRef, useState, type PointerEvent } from 'react';

export interface DragBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Options {
  pxPerMm: number;
  /** このドラッグを受け持つなら true（伝播を止めるなどもここでする） */
  canStart: (event: PointerEvent<HTMLDivElement>) => boolean;
  onEnd: (box: DragBox) => void;
}

export function useDragBox({ pxPerMm, canStart, onEnd }: Options) {
  const dragRef = useRef<DragBox | null>(null);
  const [box, setBox] = useState<DragBox | null>(null);

  const toMm = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / pxPerMm, y: (event.clientY - rect.top) / pxPerMm };
  };

  const update = (next: DragBox | null) => {
    dragRef.current = next;
    setBox(next);
  };

  return {
    /** ドラッグ中の範囲。ドラッグしていなければ null */
    box,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !canStart(event)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = toMm(event);
        update({ x0: x, y0: y, x1: x, y1: y });
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        const current = dragRef.current;
        if (!current) return;
        const { x, y } = toMm(event);
        update({ ...current, x1: x, y1: y });
      },
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
        const current = dragRef.current;
        if (!current) return;
        const { x, y } = toMm(event);
        update(null);
        onEnd({ ...current, x1: x, y1: y });
      },
      onPointerCancel: () => update(null),
    },
  };
}

/** 範囲を左上・幅・高さで表す。 */
export function boxRect(box: DragBox) {
  return {
    xMm: Math.min(box.x0, box.x1),
    yMm: Math.min(box.y0, box.y1),
    wMm: Math.abs(box.x1 - box.x0),
    hMm: Math.abs(box.y1 - box.y0),
  };
}
