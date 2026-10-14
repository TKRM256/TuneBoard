/** 検出した罫線を書式の上に重ねて見せる（検出結果の確認用）。 */
import type { PageLine } from './ruled-lines';

interface Props {
  lines: PageLine[];
  pxPerMm: number;
}

export function RuledLinesOverlay({ lines, pxPerMm }: Props) {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <g stroke="rgb(14 165 233 / 0.85)" strokeWidth={1.5}>
        {lines.map((line, index) => (line.axis === 'h'
          ? <line key={index} x1={line.fromMm * pxPerMm} x2={line.toMm * pxPerMm} y1={line.posMm * pxPerMm} y2={line.posMm * pxPerMm} />
          : <line key={index} x1={line.posMm * pxPerMm} x2={line.posMm * pxPerMm} y1={line.fromMm * pxPerMm} y2={line.toMm * pxPerMm} />
        ))}
      </g>
    </svg>
  );
}
