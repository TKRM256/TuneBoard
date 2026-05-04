/** The visual page canvas. Hosts each element wrapped in <Rnd> and forwards
 *  drag/resize events back up. Coordinates are mm; pxPerMm controls zoom. */
import { type CSSProperties, type PointerEvent } from 'react';
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
  snapMm: number;
}

export function CanvasFrame({ doc, catalog, pxPerMm, selectedIds, onSelect, onUpdate, snapMm }: Props) {
  const { widthMm, heightMm } = getPaperDimensions(doc.page.size, doc.page.orientation);
  const widthPx = widthMm * pxPerMm;
  const heightPx = heightMm * pxPerMm;
  const snapPx = snapMm * pxPerMm;
  const marginPx = (doc.page.marginMm ?? 0) * pxPerMm;

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
          <Rnd
            key={el.id}
            size={{ width: el.wMm * pxPerMm, height: el.hMm * pxPerMm }}
            position={{ x: el.xMm * pxPerMm, y: el.yMm * pxPerMm }}
            bounds="parent"
            dragGrid={[snapPx, snapPx]}
            resizeGrid={[snapPx, snapPx]}
            minWidth={snapPx * 2}
            minHeight={snapPx}
            onDragStop={(_, d) => {
              onUpdate(el.id, {
                xMm: roundMm(d.x / pxPerMm),
                yMm: roundMm(d.y / pxPerMm),
              });
            }}
            onResizeStop={(_, __, ref, ___, position) => {
              onUpdate(el.id, {
                xMm: roundMm(position.x / pxPerMm),
                yMm: roundMm(position.y / pxPerMm),
                wMm: roundMm(parseFloat(ref.style.width) / pxPerMm),
                hMm: roundMm(parseFloat(ref.style.height) / pxPerMm),
              });
            }}
            style={selectionStyle(selected)}
          >
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(el.id, e.shiftKey);
              }}
              style={{ width: '100%', height: '100%', cursor: 'move' }}
            >
              <CanvasElementView element={el} catalog={catalog} selected={selected} />
            </div>
          </Rnd>
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
