/** The visual page canvas. Hosts each element via the shared ElementLayer and
 *  forwards drag/resize events back up. Coordinates are mm; pxPerMm controls zoom. */
import type { PointerEvent } from 'react';

import type { CanvasDocument, CanvasElement } from '../canvas-schema';
import { getPaperDimensions } from '../canvas-schema';
import type { FieldCatalog } from '../../canvas-shared/field-catalog';
import { ElementLayer } from '../../canvas-shared/ElementLayer';
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
        width: widthMm * pxPerMm,
        height: heightMm * pxPerMm,
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
      <ElementLayer
        elements={doc.elements}
        pxPerMm={pxPerMm}
        selectedIds={selectedIds}
        snapMm={snapMm}
        onSelect={onSelect}
        onUpdate={(id, patch) => onUpdate(id, patch)}
        onMoveSelection={onMoveSelection}
        renderElement={(el, selected) => <CanvasElementView element={el} catalog={catalog} selected={selected} />}
      />
    </div>
  );
}
