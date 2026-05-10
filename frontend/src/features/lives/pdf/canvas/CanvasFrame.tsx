/** The visual page canvas. Hosts each element wrapped in <Rnd> and forwards
 *  drag/resize events back up. Coordinates are mm; pxPerMm controls zoom.
 *
 *  Multi-drag: when multiple elements are selected and one is dragged, all
 *  selected elements move together. Non-dragged selected elements are
 *  translated via CSS transform on a full-canvas wrapper div so react-rnd's
 *  internal position state is not disturbed during the drag.
 *
 *  Shift+Resize: holding Shift while resizing locks the aspect ratio. */
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

import type { CanvasDocument, CanvasElement } from '../canvas-schema';
import { getPaperDimensions } from '../canvas-schema';
import type { FieldCatalog } from '../field-catalog';
import { CanvasElementView } from './CanvasElementView';

interface Props {
  doc: CanvasDocument;
  catalog: FieldCatalog;
  pxPerMm: number;
  selectedIds: Set<string>;
  onSelect: (id: string | null, additive: boolean) => void;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
  onMoveSelection: (dxMm: number, dyMm: number) => void;
  snapMm: number;
}

export function CanvasFrame({ doc, catalog, pxPerMm, selectedIds, onSelect, onUpdate, onMoveSelection, snapMm }: Props) {
  const { widthMm, heightMm } = getPaperDimensions(doc.page.size, doc.page.orientation);
  const widthPx = widthMm * pxPerMm;
  const heightPx = heightMm * pxPerMm;
  const snapPx = snapMm * pxPerMm;
  const marginPx = (doc.page.marginMm ?? 0) * pxPerMm;

  // Shift key state for aspect-ratio locking during resize.
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

  // Multi-drag: refs to each element's full-canvas wrapper div.
  // Plain refs — not memoized — so DOM mutations don't trigger lint immutability rules.
  const wrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  // Regular (non-memoized) event handlers so DOM mutations on wrapperRefs
  // are not subject to react-hooks/immutability restrictions.
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

  const handleDragStop = (elId: string, finalX: number, finalY: number, el: CanvasElement) => {
    if (draggedIdRef.current !== elId) return;
    const start = dragStartRef.current;
    draggedIdRef.current = null;
    dragStartRef.current = null;

    // Reset CSS transforms on all wrappers.
    for (const [, div] of wrapperRefs.current) {
      div.style.transform = '';
    }

    if (selectedIds.size > 1 && start) {
      const dxMm = (finalX - start.x) / pxPerMm;
      const dyMm = (finalY - start.y) / pxPerMm;
      onMoveSelection(dxMm, dyMm);
    } else {
      onUpdate(el.id, {
        xMm: roundMm(finalX / pxPerMm),
        yMm: roundMm(finalY / pxPerMm),
      });
    }
  };

  const handleBackgroundClick = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onSelect(null, false);
    }
  };

  return (
    <div
      onPointerDown={handleBackgroundClick}
      style={{
        width: widthPx,
        height: heightPx,
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(15,23,42,0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Margin guide */}
      {marginPx > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: marginPx,
            border: '1px dashed #e2e8f0',
            pointerEvents: 'none',
          }}
        />
      )}
      {doc.elements.map((el) => {
        const selected = selectedIds.has(el.id);
        return (
          // Full-canvas wrapper: CSS transform applied here for multi-drag preview
          // without disturbing react-rnd's own position tracking.
          <div
            key={el.id}
            ref={(div) => {
              if (div) wrapperRefs.current.set(el.id, div);
              else wrapperRefs.current.delete(el.id);
            }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <Rnd
              size={{ width: el.wMm * pxPerMm, height: el.hMm * pxPerMm }}
              position={{ x: el.xMm * pxPerMm, y: el.yMm * pxPerMm }}
              bounds="parent"
              dragGrid={[snapPx, snapPx]}
              resizeGrid={[snapPx, snapPx]}
              minWidth={snapPx * 2}
              minHeight={snapPx}
              lockAspectRatio={shiftHeld}
              style={{ ...selectionStyle(selected), pointerEvents: 'auto' }}
              onDragStart={(_, d) => handleDragStart(el.id, d.x, d.y)}
              onDrag={(_, d) => handleDrag(el.id, d.x, d.y)}
              onDragStop={(_, d) => handleDragStop(el.id, d.x, d.y, el)}
              onResizeStop={(_, __, ref, ___, position) => {
                onUpdate(el.id, {
                  xMm: roundMm(position.x / pxPerMm),
                  yMm: roundMm(position.y / pxPerMm),
                  wMm: roundMm(parseFloat(ref.style.width) / pxPerMm),
                  hMm: roundMm(parseFloat(ref.style.height) / pxPerMm),
                });
              }}
            >
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Already-selected elements start a drag — don't reset multi-selection.
                  if (!e.shiftKey && selectedIds.has(el.id)) return;
                  onSelect(el.id, e.shiftKey);
                }}
                style={{ width: '100%', height: '100%', cursor: 'move' }}
              >
                <CanvasElementView element={el} catalog={catalog} selected={selected} />
              </div>
            </Rnd>
          </div>
        );
      })}
    </div>
  );
}

function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

function selectionStyle(selected: boolean): CSSProperties {
  return {
    boxShadow: selected ? '0 0 0 1.5px #2563eb' : 'none',
  };
}
