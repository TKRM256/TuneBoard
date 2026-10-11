/** 要素の端を、近くの罫線に吸い付かせる計算。座標はすべて mm。 */
import type { MmBox } from './geometry';

/** 吸着の相手になる線（mm）。横線なら pos が y、from〜to が x の範囲。 */
export interface SnapLine {
  axis: 'h' | 'v';
  posMm: number;
  fromMm: number;
  toMm: number;
}

/** 位置と大きさ（mm）。 */
export type SnapBox = Pick<MmBox, 'xMm' | 'yMm' | 'wMm' | 'hMm'>;

export interface SnapResult {
  box: SnapBox;
  /** 吸い付いた罫線（ガイドとして見せる） */
  guides: SnapLine[];
}

/** リサイズで動く辺（react-rnd の向きの名前）。 */
export type ResizeDirection = 'top' | 'right' | 'bottom' | 'left' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft';

interface Edge {
  value: number;
  line: SnapLine;
}

/** 線の範囲が、要素の横（縦）の範囲と重なっているか。少し離れていても threshold までは重なりとみなす。 */
function spans(line: SnapLine, from: number, to: number, threshold: number) {
  return line.fromMm <= to + threshold && line.toMm >= from - threshold;
}

/** values のどれかに最も近い罫線（threshold 以内）。返り値は [values の添字, 線]。 */
function nearest(values: number[], lines: SnapLine[], threshold: number): [number, SnapLine] | null {
  let best: [number, SnapLine] | null = null;
  let bestDistance = threshold;
  for (let index = 0; index < values.length; index++) {
    for (const line of lines) {
      const distance = Math.abs(line.posMm - values[index]);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = [index, line];
      }
    }
  }
  return best;
}

function candidates(lines: SnapLine[], box: SnapBox, threshold: number) {
  return {
    vertical: lines.filter((line) => line.axis === 'v' && spans(line, box.yMm, box.yMm + box.hMm, threshold)),
    horizontal: lines.filter((line) => line.axis === 'h' && spans(line, box.xMm, box.xMm + box.wMm, threshold)),
  };
}

/** 動かしている要素の左右の端・上下の端のうち、罫線に近いほうを合わせる。大きさは変えない。 */
export function snapMove(box: SnapBox, lines: SnapLine[], threshold: number): SnapResult {
  const { vertical, horizontal } = candidates(lines, box, threshold);
  const guides: SnapLine[] = [];
  let { xMm, yMm } = box;
  const x = nearest([box.xMm, box.xMm + box.wMm], vertical, threshold);
  if (x) {
    xMm = x[0] === 0 ? x[1].posMm : x[1].posMm - box.wMm;
    guides.push(x[1]);
  }
  const y = nearest([box.yMm, box.yMm + box.hMm], horizontal, threshold);
  if (y) {
    yMm = y[0] === 0 ? y[1].posMm : y[1].posMm - box.hMm;
    guides.push(y[1]);
  }
  return { box: { ...box, xMm, yMm }, guides };
}

/** リサイズで動かした辺だけを罫線に合わせる。反対側の辺は動かさない。 */
export function snapResize(box: SnapBox, direction: ResizeDirection, lines: SnapLine[], threshold: number, minMm: number): SnapResult {
  const { vertical, horizontal } = candidates(lines, box, threshold);
  const guides: SnapLine[] = [];
  let left = box.xMm;
  let right = box.xMm + box.wMm;
  let top = box.yMm;
  let bottom = box.yMm + box.hMm;
  const snapEdge = (value: number, pool: SnapLine[]): Edge | null => {
    const hit = nearest([value], pool, threshold);
    return hit ? { value: hit[1].posMm, line: hit[1] } : null;
  };
  // 合わせると小さくなりすぎる辺は合わせない
  const apply = (edge: Edge | null, fits: (value: number) => boolean, set: (value: number) => void) => {
    if (!edge || !fits(edge.value)) return;
    set(edge.value);
    guides.push(edge.line);
  };
  if (/left/i.test(direction)) apply(snapEdge(left, vertical), (v) => right - v >= minMm, (v) => { left = v; });
  if (/right/i.test(direction)) apply(snapEdge(right, vertical), (v) => v - left >= minMm, (v) => { right = v; });
  if (/top/i.test(direction)) apply(snapEdge(top, horizontal), (v) => bottom - v >= minMm, (v) => { top = v; });
  if (/bottom/i.test(direction)) apply(snapEdge(bottom, horizontal), (v) => v - top >= minMm, (v) => { bottom = v; });
  return { box: { xMm: left, yMm: top, wMm: right - left, hMm: bottom - top }, guides };
}
