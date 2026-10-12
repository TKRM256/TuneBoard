/** 何もないところからドラッグして、四角で囲んだ要素をまとめて選ぶ。Shift を押していれば今の選択に足す。 */
import { useRef } from 'react';

import type { MmBox } from './geometry';
import type { SnapBox } from './snapping';
import { boxRect, useDragBox } from './useDragBox';

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

export function useMarqueeSelect({ elements, pxPerMm, onSelect, onSelectMany }: Options) {
  const additiveRef = useRef(false);
  const { box, handlers } = useDragBox({
    pxPerMm,
    // 要素や操作用のレイヤーの上では始めない
    canStart: (event) => {
      if (event.target !== event.currentTarget) return false;
      additiveRef.current = event.shiftKey;
      return true;
    },
    onEnd: (end) => {
      const rect = boxRect(end);
      const additive = additiveRef.current;
      if (rect.wMm * pxPerMm < CLICK_PX && rect.hMm * pxPerMm < CLICK_PX) {
        if (!additive) onSelect(null, false);
        return;
      }
      onSelectMany(idsInRect(elements, rect), additive);
    },
  });

  return {
    /** 囲んでいる途中の四角（mm）。囲んでいなければ null */
    rect: box ? boxRect(box) : null,
    handlers,
  };
}
