/** 書式の上をドラッグして範囲を囲む（範囲から表を作るとき）。要素の操作より手前に重ねる。 */
import { useState, type PointerEvent } from 'react';

import type { Region } from './table-grid';

interface Props {
  pxPerMm: number;
  onSelect: (region: Region) => void;
  onCancel: () => void;
}

/** これより小さい範囲はクリックとみなして取りやめる */
const MIN_REGION_MM = 3;

export function RegionSelectLayer({ pxPerMm, onSelect, onCancel }: Props) {
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
    const region = {
      left: Math.min(drag.x0, drag.x1),
      top: Math.min(drag.y0, drag.y1),
      right: Math.max(drag.x0, drag.x1),
      bottom: Math.max(drag.y0, drag.y1),
    };
    setDrag(null);
    if (region.right - region.left < MIN_REGION_MM || region.bottom - region.top < MIN_REGION_MM) onCancel();
    else onSelect(region);
  };

  return (
    <div
      className="absolute inset-0 cursor-crosshair bg-sky-500/5"
      style={{ zIndex: 5 }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => setDrag(null)}
    >
      {drag ? (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-sky-500 bg-sky-500/10"
          style={{
            left: Math.min(drag.x0, drag.x1) * pxPerMm,
            top: Math.min(drag.y0, drag.y1) * pxPerMm,
            width: Math.abs(drag.x1 - drag.x0) * pxPerMm,
            height: Math.abs(drag.y1 - drag.y0) * pxPerMm,
          }}
        />
      ) : null}
    </div>
  );
}
