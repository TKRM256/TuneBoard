/** mm 座標の要素を <Rnd> で包み、ドラッグ・リサイズを座標の更新として返すレイヤー。
 *  PDF キャンバスと会場書式のエディタで共通に使う。
 *
 *  Multi-drag: when multiple elements are selected and one is dragged, all
 *  selected elements move together. Non-dragged selected elements are
 *  translated via CSS transform on a full-canvas wrapper div so react-rnd's
 *  internal position state is not disturbed during the drag.
 *
 *  Shift+Resize: holding Shift while resizing locks the aspect ratio.
 *
 *  罫線への吸着: snapLines を渡すと、Alt を押しながら動かす・大きさを変えるときだけ要素の端が近くの線に吸い付く。
 *  ドラッグ中の位置は react-rnd に任せたまま、吸着後の位置との差だけを CSS transform でずらして見せ、
 *  離したときに吸着後の位置を保存する（react-rnd の位置を上書きすると、同じ線に吸い付いている間ずれていくため）。 */
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

import { round1, type MmBox } from './geometry';
import { snapMove, snapResize, type ResizeDirection, type SnapBox, type SnapLine } from './snapping';
import { SnapGuides } from './SnapGuides';

interface Props<T extends MmBox> {
  elements: T[];
  pxPerMm: number;
  selectedIds: Set<string>;
  snapMm: number;
  onSelect: (id: string | null, additive: boolean) => void;
  onUpdate: (id: string, patch: Partial<MmBox>) => void;
  onMoveSelection: (dxMm: number, dyMm: number) => void;
  renderElement: (element: T, selected: boolean) => ReactNode;
  /** Alt を押している間だけ吸着の相手にする線（mm）。空なら吸着しない */
  snapLines?: SnapLine[];
  onElementDoubleClick?: (id: string) => void;
}

/** 吸着する距離（画面上のピクセル）。拡大率によらず同じ感覚で効くようにする */
const SNAP_THRESHOLD_PX = 8;

interface DragState {
  id: string;
  start: { x: number; y: number };
  /** マウスの移動量を足した、吸着前の位置（px） */
  raw: { x: number; y: number };
  /** 吸着後の位置（px）。離したときに保存する */
  snapped: { x: number; y: number };
}

export function ElementLayer<T extends MmBox>({
  elements,
  pxPerMm,
  selectedIds,
  snapMm,
  onSelect,
  onUpdate,
  onMoveSelection,
  renderElement,
  snapLines = NO_LINES,
  onElementDoubleClick,
}: Props<T>) {
  const snapPx = snapMm * pxPerMm;
  const shiftHeld = useShiftHeld();
  const thresholdMm = SNAP_THRESHOLD_PX / pxPerMm;
  const [guides, setGuides] = useState<SnapLine[]>(NO_LINES);

  // Multi-drag: refs to each element's full-canvas wrapper div.
  const wrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const resizeSnapRef = useRef<SnapBox | null>(null);
  const suppressAltMenu = useSuppressAltMenu();

  const handleDragStart = (elId: string, startX: number, startY: number) => {
    if (!selectedIds.has(elId)) return;
    const start = { x: startX, y: startY };
    dragRef.current = { id: elId, start, raw: { ...start }, snapped: { ...start } };
  };

  const handleDrag = (el: T, altKey: boolean, deltaX: number, deltaY: number) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== el.id) return;
    drag.raw = { x: drag.raw.x + deltaX, y: drag.raw.y + deltaY };
    const wrapper = wrapperRefs.current.get(el.id);
    const maxX = (wrapper?.clientWidth ?? Infinity) - el.wMm * pxPerMm;
    const maxY = (wrapper?.clientHeight ?? Infinity) - el.hMm * pxPerMm;
    // react-rnd は親の範囲に収めて表示するので、同じように収めた位置が今見えている位置
    const shown = { x: clamp(drag.raw.x, 0, maxX), y: clamp(drag.raw.y, 0, maxY) };
    let target = shown;
    if (snapLines.length > 0 && altKey) {
      suppressAltMenu();
      const box = { xMm: shown.x / pxPerMm, yMm: shown.y / pxPerMm, wMm: el.wMm, hMm: el.hMm };
      const result = snapMove(box, snapLines, thresholdMm);
      target = { x: clamp(result.box.xMm * pxPerMm, 0, maxX), y: clamp(result.box.yMm * pxPerMm, 0, maxY) };
      setGuides(result.guides.length > 0 ? result.guides : NO_LINES);
    } else {
      setGuides(NO_LINES);
    }
    drag.snapped = target;
    if (wrapper) wrapper.style.transform = translate(target.x - shown.x, target.y - shown.y);
    for (const [id, div] of wrapperRefs.current) {
      if (id !== el.id && selectedIds.has(id)) {
        div.style.transform = translate(target.x - drag.start.x, target.y - drag.start.y);
      }
    }
  };

  const handleDragStop = (elId: string) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== elId) return;
    dragRef.current = null;
    setGuides(NO_LINES);

    for (const [, div] of wrapperRefs.current) {
      div.style.transform = '';
    }

    const { start, snapped } = drag;
    if (snapped.x === start.x && snapped.y === start.y) return;
    if (selectedIds.size > 1) {
      onMoveSelection((snapped.x - start.x) / pxPerMm, (snapped.y - start.y) / pxPerMm);
    } else {
      onUpdate(elId, { xMm: round1(snapped.x / pxPerMm), yMm: round1(snapped.y / pxPerMm) });
    }
  };

  const handleResize = (altKey: boolean, direction: string, box: SnapBox) => {
    if (snapLines.length === 0 || !altKey || shiftHeld) {
      resizeSnapRef.current = null;
      setGuides(NO_LINES);
      return;
    }
    suppressAltMenu();
    const minMm = Math.max(MIN_PX, snapPx) / pxPerMm;
    const result = snapResize(box, direction as ResizeDirection, snapLines, thresholdMm, minMm);
    resizeSnapRef.current = result.box;
    setGuides(result.guides.length > 0 ? result.guides : NO_LINES);
  };

  return (
    <>
      {elements.map((el) => {
        const selected = selectedIds.has(el.id);
        const widthPx = el.wMm * pxPerMm;
        const heightPx = el.hMm * pxPerMm;
        // 小さい要素は、端のつまみが要素全体を覆ってドラッグも選択もできなくなるので、
        // つまみを右下の 1 つだけにして外側に出し、周りに当たり判定を広げる
        const small = widthPx < SMALL_PX || heightPx < SMALL_PX;
        return (
          // Full-canvas wrapper: CSS transform applied here for multi-drag preview
          // without disturbing react-rnd's own position tracking.
          <div
            key={el.id}
            ref={(div) => {
              if (div) wrapperRefs.current.set(el.id, div);
              else wrapperRefs.current.delete(el.id);
            }}
            // 大きい要素の下に小さい要素が隠れて選べなくならないよう、選択中と小さい要素を上に重ねる
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: selected ? 3 : small ? 2 : 1 }}
          >
            <Rnd
              size={{ width: widthPx, height: heightPx }}
              position={{ x: el.xMm * pxPerMm, y: el.yMm * pxPerMm }}
              bounds="parent"
              dragGrid={[snapPx, snapPx]}
              resizeGrid={[snapPx, snapPx]}
              minWidth={Math.max(MIN_PX, snapPx)}
              minHeight={Math.max(MIN_PX, snapPx)}
              lockAspectRatio={shiftHeld}
              enableResizing={selected ? (small ? { bottomRight: true } : true) : false}
              resizeHandleStyles={selected ? { bottomRight: small ? OUTER_HANDLE : CORNER_HANDLE } : undefined}
              style={{ ...selectionStyle(selected), pointerEvents: 'auto' }}
              onDragStart={(_, d) => handleDragStart(el.id, d.x, d.y)}
              onDrag={(event, d) => handleDrag(el, altKeyOf(event), d.deltaX, d.deltaY)}
              onDragStop={() => handleDragStop(el.id)}
              onResize={(event, direction, ref, _, position) => handleResize(altKeyOf(event), direction, toMmBox(ref, position, pxPerMm))}
              onResizeStop={(_, __, ref, ___, position) => {
                const snapped = resizeSnapRef.current;
                resizeSnapRef.current = null;
                setGuides(NO_LINES);
                const box = snapped ?? toMmBox(ref, position, pxPerMm);
                onUpdate(el.id, { xMm: round1(box.xMm), yMm: round1(box.yMm), wMm: round1(box.wMm), hMm: round1(box.hMm) });
              }}
            >
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // 要素を掴んだら文字の範囲選択を外し、Ctrl+C が要素のコピーとして働くようにする
                  window.getSelection()?.removeAllRanges();
                  // Already-selected elements start a drag — don't reset multi-selection.
                  if (!e.shiftKey && selectedIds.has(el.id)) return;
                  onSelect(el.id, e.shiftKey);
                }}
                onDoubleClick={onElementDoubleClick ? () => onElementDoubleClick(el.id) : undefined}
                style={{ width: '100%', height: '100%', cursor: 'move', position: 'relative' }}
              >
                {small ? <span aria-hidden style={{ position: 'absolute', inset: -HIT_SLOP_PX }} /> : null}
                {renderElement(el, selected)}
              </div>
            </Rnd>
          </div>
        );
      })}
      {guides.length > 0 ? <SnapGuides lines={guides} pxPerMm={pxPerMm} /> : null}
    </>
  );
}

const NO_LINES: SnapLine[] = [];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function translate(dx: number, dy: number) {
  return dx === 0 && dy === 0 ? '' : `translate(${dx}px, ${dy}px)`;
}

function altKeyOf(event: unknown) {
  return Boolean((event as { altKey?: boolean } | null)?.altKey);
}

function toMmBox(ref: HTMLElement, position: { x: number; y: number }, pxPerMm: number): SnapBox {
  return {
    xMm: position.x / pxPerMm,
    yMm: position.y / pxPerMm,
    wMm: parseFloat(ref.style.width) / pxPerMm,
    hMm: parseFloat(ref.style.height) / pxPerMm,
  };
}

/** これより小さい要素は、つまみを外に出して当たり判定を広げる */
const SMALL_PX = 24;
const MIN_PX = 4;
const HIT_SLOP_PX = 8;
const CORNER_HANDLE: CSSProperties = {
  right: -5,
  bottom: -5,
  width: 10,
  height: 10,
  background: '#2563eb',
  border: '1px solid #ffffff',
  borderRadius: 2,
};
const OUTER_HANDLE: CSSProperties = { ...CORNER_HANDLE, right: -14, bottom: -14 };

/** Alt を吸着に使ったあと、離したときにブラウザのメニューへ移らないようにする。返す関数は吸着した時に呼ぶ。 */
function useSuppressAltMenu() {
  const usedRef = useRef(false);
  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.key !== 'Alt' || !usedRef.current) return;
      usedRef.current = false;
      e.preventDefault();
    };
    window.addEventListener('keyup', up);
    return () => window.removeEventListener('keyup', up);
  }, []);
  return () => { usedRef.current = true; };
}

/** Shift key state for aspect-ratio locking during resize. */
function useShiftHeld() {
  const [shiftHeld, setShiftHeld] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  return shiftHeld;
}

function selectionStyle(selected: boolean): CSSProperties {
  return {
    boxShadow: selected ? '0 0 0 1.5px #2563eb' : 'none',
  };
}
