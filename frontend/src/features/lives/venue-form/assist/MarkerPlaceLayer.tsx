/** 選択肢の印を置く場所を受け取る。クリックは点、ドラッグは範囲（○囲みの大きさなど）。 */
import type { SnapBox } from '../../canvas-shared/snapping';
import { boxRect, useDragBox } from '../../canvas-shared/useDragBox';
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
  const { box, handlers } = useDragBox({
    pxPerMm,
    canStart: (event) => {
      event.stopPropagation();
      return true;
    },
    onEnd: (end) => {
      const rect = boxRect(end);
      if (rect.wMm < DRAG_MM && rect.hMm < DRAG_MM) onPlace(markerBoxAt(kind, end.x0, end.y0, lines));
      else onPlace({ xMm: round2(rect.xMm), yMm: round2(rect.yMm), wMm: round2(Math.max(rect.wMm, DRAG_MM)), hMm: round2(Math.max(rect.hMm, DRAG_MM)) });
    },
  });
  const rect = box ? boxRect(box) : null;

  return (
    <div className="absolute inset-0 cursor-crosshair" style={{ zIndex: 5 }} {...handlers}>
      {rect ? (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-red-500"
          style={{
            left: rect.xMm * pxPerMm,
            top: rect.yMm * pxPerMm,
            width: rect.wMm * pxPerMm,
            height: rect.hMm * pxPerMm,
            borderRadius: kind === 'circle' ? '50%' : undefined,
          }}
        />
      ) : null}
    </div>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
