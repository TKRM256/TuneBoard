/** 会場書式の 1 ページ。背景（会場の書式）の上に要素を置く。背景は出力と同じく縦横比を保ってページに収める。 */
import type { PointerEvent, Ref } from 'react';
import { Loader2 } from 'lucide-react';

import { useAuthedObjectUrl } from '@/hooks/use-authed-object-url';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { ElementLayer } from '../canvas-shared/ElementLayer';
import type { MmBox } from '../canvas-shared/geometry';
import type { PageLine } from './assist/ruled-lines';
import { RuledLinesOverlay } from './assist/RuledLinesOverlay';
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
  canvasRef?: Ref<HTMLDivElement>;
  /** 背景が PDF のときだけ、拡大に合わせて高い解像度で描き直せる */
  backgroundIsPdf?: boolean;
  /** 背景から検出した罫線。showRuledLines のときは重ねて見せる */
  ruledLines?: PageLine[];
  showRuledLines?: boolean;
}

/** 背景の PDF を描く解像度の段階。画面の実際の密度（拡大率 × 画面の倍率）に足りる最小の段階を選ぶ。 */
const PREVIEW_DPI = 110;
const MAX_QUALITY = 3;

function backgroundQuality(pxPerMm: number) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const neededDpi = pxPerMm * 25.4 * dpr;
  return Math.min(MAX_QUALITY, Math.max(1, Math.ceil(neededDpi / PREVIEW_DPI - 0.15)));
}

export function VenueCanvas({ liveId, page, elements, catalog, pxPerMm, selectedIds, onSelect, onUpdate, onMoveSelection, canvasRef, backgroundIsPdf = false, ruledLines = [], showRuledLines = false }: Props) {
  const background = page.background;
  const quality = background && backgroundIsPdf ? backgroundQuality(pxPerMm) : 1;
  const backgroundPath = background ? venuePagePreviewPath(liveId, background.assetId, background.pageIndex) : null;
  // 拡大したときは高い解像度の画像を読み込み、読み終わるまでは低い解像度の画像を見せておく
  const sharpPath = background && quality > 1
    ? venuePagePreviewPath(liveId, background.assetId, background.pageIndex, quality)
    : null;
  const { url, failed } = useAuthedObjectUrl(backgroundPath);
  const { url: sharpUrl } = useAuthedObjectUrl(sharpPath);

  const handleBackgroundPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onSelect(null, false);
  };

  return (
    <div
      ref={canvasRef}
      onPointerDown={handleBackgroundPointerDown}
      className="relative overflow-hidden bg-white shadow-[0_4px_24px_rgba(15,23,42,0.15)]"
      style={{ width: page.widthMm * pxPerMm, height: page.heightMm * pxPerMm }}
    >
      {url ? (
        <img src={url} alt="会場書式の背景" draggable={false} className="pointer-events-none absolute inset-0 size-full object-contain" />
      ) : null}
      {sharpUrl ? (
        <img src={sharpUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-contain" />
      ) : null}
      {backgroundPath && !url ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center text-xs text-muted-foreground">
          {failed ? '背景を読み込めませんでした' : <Loader2 className="size-5 animate-spin" />}
        </div>
      ) : null}
      {showRuledLines ? <RuledLinesOverlay lines={ruledLines} pxPerMm={pxPerMm} /> : null}
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
