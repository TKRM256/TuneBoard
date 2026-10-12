/** 書式の上をドラッグして範囲を囲む（表の欄に項目を並べるとき）。要素の操作より手前に重ねる。 */
import { boxRect, useDragBox } from '../../canvas-shared/useDragBox';
import type { Region } from './table-grid';

interface Props {
  pxPerMm: number;
  onSelect: (region: Region) => void;
  onCancel: () => void;
}

/** これより小さい範囲はクリックとみなして取りやめる */
const MIN_REGION_MM = 3;

export function RegionSelectLayer({ pxPerMm, onSelect, onCancel }: Props) {
  const { box, handlers } = useDragBox({
    pxPerMm,
    canStart: (event) => {
      event.stopPropagation();
      return true;
    },
    onEnd: (end) => {
      const rect = boxRect(end);
      if (rect.wMm < MIN_REGION_MM || rect.hMm < MIN_REGION_MM) onCancel();
      else onSelect({ left: rect.xMm, top: rect.yMm, right: rect.xMm + rect.wMm, bottom: rect.yMm + rect.hMm });
    },
  });
  const rect = box ? boxRect(box) : null;

  return (
    <div className="absolute inset-0 cursor-crosshair bg-sky-500/5" style={{ zIndex: 5 }} {...handlers}>
      {rect ? (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-sky-500 bg-sky-500/10"
          style={{ left: rect.xMm * pxPerMm, top: rect.yMm * pxPerMm, width: rect.wMm * pxPerMm, height: rect.hMm * pxPerMm }}
        />
      ) : null}
    </div>
  );
}
