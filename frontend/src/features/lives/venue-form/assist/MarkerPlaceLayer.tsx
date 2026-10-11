/** 選択肢の印を置く場所を受け取る。クリックは点、ドラッグは範囲（○囲みの大きさなど）。 */
import { useState, type PointerEvent } from 'react';

import type { SnapBox } from '../../canvas-shared/snapping';
import type { PageLine } from './ruled-lines';
import { markerBoxAt, type MarkerKind } from './choice-markers';

interface Props {
  pxPerMm: number;
  kind: MarkerKind;
  lines: PageLine[];
  onPlace: (box: SnapBox) => void;
}

/** これより小さいドラッグはクリックとみなす */
const DRAG_MM = 1.5;

export function MarkerPlaceLayer({ pxPerMm, kind, lines, onPlace }: Props) {
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const toMm = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / pxPerMm, y: (event.clientY - rect.top) / pxPerMm };
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = toMm(event);
    setDrag({ x0: x, y0: y, x1: x, y1: y });
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const { x, y } = toMm(event);
    setDrag({ ...drag, x1: x, y1: y });
  };

  const handleUp = () => {
    if (!drag) return;
    setDrag(null);
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    if (w < DRAG_MM && h < DRAG_MM) {
      onPlace(markerBoxAt(kind, drag.x0, drag.y0, lines));
      return;
    }
    onPlace({ xMm: Math.min(drag.x0, drag.x1), yMm: Math.min(drag.y0, drag.y1), wMm: Math.max(w, DRAG_MM), hMm: Math.max(h, DRAG_MM) });
  };

  return (
    <div
      className="absolute inset-0 cursor-crosshair"
      style={{ zIndex: 5 }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => setDrag(null)}
    >
      {drag ? (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-red-500"
          style={{
            left: Math.min(drag.x0, drag.x1) * pxPerMm,
            top: Math.min(drag.y0, drag.y1) * pxPerMm,
            width: Math.abs(drag.x1 - drag.x0) * pxPerMm,
            height: Math.abs(drag.y1 - drag.y0) * pxPerMm,
            borderRadius: kind === 'circle' ? '50%' : undefined,
          }}
        />
      ) : null}
    </div>
  );
}
