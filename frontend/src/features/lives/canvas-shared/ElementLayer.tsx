/** mm 座標の要素を <Rnd> で包み、ドラッグ・リサイズを座標の更新として返すレイヤー。
 *  PDF キャンバスと会場書式のエディタで共通に使う。
 *
 *  Multi-drag: when multiple elements are selected and one is dragged, all
 *  selected elements move together. Non-dragged selected elements are
 *  translated via CSS transform on a full-canvas wrapper div so react-rnd's
 *  internal position state is not disturbed during the drag.
 *
 *  Shift+Resize: holding Shift while resizing locks the aspect ratio. */
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

import { round1, type MmBox } from './geometry';

interface Props<T extends MmBox> {
  elements: T[];
  pxPerMm: number;
  selectedIds: Set<string>;
  snapMm: number;
  onSelect: (id: string | null, additive: boolean) => void;
  onUpdate: (id: string, patch: Partial<MmBox>) => void;
  onMoveSelection: (dxMm: number, dyMm: number) => void;
  renderElement: (element: T, selected: boolean) => ReactNode;
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
}: Props<T>) {
  const snapPx = snapMm * pxPerMm;
  const shiftHeld = useShiftHeld();

  // Multi-drag: refs to each element's full-canvas wrapper div.
  const wrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const handleDragStart = (elId: string, startX: number, startY: number) => {
    if (!selectedIds.has(elId)) return;
    draggedIdRef.current = elId;
    dragStartRef.current = { x: startX, y: startY };
  };

  const handleDrag = (elId: string, currentX: number, currentY: number) => {
    if (draggedIdRef.current !== elId || !dragStartRef.current || selectedIds.size <= 1) return;
    const dx = currentX - dragStartRef.current.x;
    const dy = currentY - dragStartRef.current.y;
    for (const [id, div] of wrapperRefs.current) {
      if (id !== elId && selectedIds.has(id)) {
        div.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }
  };

  const handleDragStop = (elId: string, finalX: number, finalY: number) => {
    if (draggedIdRef.current !== elId) return;
    const start = dragStartRef.current;
    draggedIdRef.current = null;
    dragStartRef.current = null;

    for (const [, div] of wrapperRefs.current) {
      div.style.transform = '';
    }

    if (selectedIds.size > 1 && start) {
      onMoveSelection((finalX - start.x) / pxPerMm, (finalY - start.y) / pxPerMm);
    } else {
      onUpdate(elId, { xMm: round1(finalX / pxPerMm), yMm: round1(finalY / pxPerMm) });
    }
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
              onDrag={(_, d) => handleDrag(el.id, d.x, d.y)}
              onDragStop={(_, d) => handleDragStop(el.id, d.x, d.y)}
              onResizeStop={(_, __, ref, ___, position) => {
                onUpdate(el.id, {
                  xMm: round1(position.x / pxPerMm),
                  yMm: round1(position.y / pxPerMm),
                  wMm: round1(parseFloat(ref.style.width) / pxPerMm),
                  hMm: round1(parseFloat(ref.style.height) / pxPerMm),
                });
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
                style={{ width: '100%', height: '100%', cursor: 'move', position: 'relative' }}
              >
                {small ? <span aria-hidden style={{ position: 'absolute', inset: -HIT_SLOP_PX }} /> : null}
                {renderElement(el, selected)}
              </div>
            </Rnd>
          </div>
        );
      })}
    </>
  );
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
