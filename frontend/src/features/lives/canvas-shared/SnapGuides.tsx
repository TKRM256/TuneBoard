/** 吸い付いた罫線を、ドラッグ中だけ目立つ色で示す。 */
import type { SnapLine } from './snapping';

export function SnapGuides({ lines, pxPerMm }: { lines: SnapLine[]; pxPerMm: number }) {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" style={{ zIndex: 4 }} aria-hidden>
      <g stroke="#db2777" strokeWidth={1.5} strokeDasharray="4 3">
        {lines.map((line, index) => (line.axis === 'h'
          ? <line key={index} x1={line.fromMm * pxPerMm} x2={line.toMm * pxPerMm} y1={line.posMm * pxPerMm} y2={line.posMm * pxPerMm} />
          : <line key={index} x1={line.posMm * pxPerMm} x2={line.posMm * pxPerMm} y1={line.fromMm * pxPerMm} y2={line.toMm * pxPerMm} />
        ))}
      </g>
    </svg>
  );
}
