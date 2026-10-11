/** 会場書式の 1 ページ。背景（会場の書式）の上に要素を置く。背景は出力と同じく縦横比を保ってページに収める。 */
import type { PointerEvent } from 'react';
import { Loader2 } from 'lucide-react';

import { useAuthedObjectUrl } from '@/hooks/use-authed-object-url';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { ElementLayer } from '../canvas-shared/ElementLayer';
import type { MmBox } from '../canvas-shared/geometry';
import { VenueElementView } from './VenueElementView';
import { venuePagePreviewPath } from './venue-form-api';
import type { VenueElement, VenuePage } from './venue-form-schema';

interface Props {
  liveId: string;
  page: VenuePage;
  elements: VenueElement[];
  catalog: FieldCatalog;
  pxPerMm: number;
  selectedIds: Set<string>;
  onSelect: (id: string | null, additive: boolean) => void;
  onUpdate: (id: string, patch: Partial<MmBox>) => void;
  onMoveSelection: (dxMm: number, dyMm: number) => void;
}

export function VenueCanvas({ liveId, page, elements, catalog, pxPerMm, selectedIds, onSelect, onUpdate, onMoveSelection }: Props) {
  const backgroundPath = page.background
    ? venuePagePreviewPath(liveId, page.background.assetId, page.background.pageIndex)
    : null;
  const { url, failed } = useAuthedObjectUrl(backgroundPath);

  const handleBackgroundPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onSelect(null, false);
  };

  return (
    <div
      onPointerDown={handleBackgroundPointerDown}
      className="relative overflow-hidden bg-white shadow-[0_4px_24px_rgba(15,23,42,0.15)]"
      style={{ width: page.widthMm * pxPerMm, height: page.heightMm * pxPerMm }}
    >
      {url ? (
        <img src={url} alt="会場書式の背景" draggable={false} className="pointer-events-none absolute inset-0 size-full object-contain" />
      ) : null}
      {backgroundPath && !url ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center text-xs text-muted-foreground">
          {failed ? '背景を読み込めませんでした' : <Loader2 className="size-5 animate-spin" />}
        </div>
      ) : null}
      <ElementLayer
        elements={elements}
        pxPerMm={pxPerMm}
        selectedIds={selectedIds}
        snapMm={0.5}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onMoveSelection={onMoveSelection}
        renderElement={(element, selected) => (
          <VenueElementView element={element} catalog={catalog} pxPerMm={pxPerMm} selected={selected} />
        )}
      />
    </div>
  );
}
