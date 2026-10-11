/** 下絵の上に配置図のアイコンを並べて描く。onMove を渡すとアイコンをドラッグで動かせる（指でも可）。 */
import { useRef, type PointerEvent } from 'react';

import { cn } from '@/lib/utils';

import { SvgIconNodes } from './SvgIconNodes';
import { clamp01, type PaletteItem, type PlotItem } from './stage-plot-types';

interface Props {
  palette: PaletteItem[];
  iconScale: number;
  aspectRatio: number;
  baseUrl: string | null;
  items: PlotItem[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  className?: string;
}

export function StagePlotCanvas({
  palette,
  iconScale,
  aspectRatio,
  baseUrl,
  items,
  selectedId,
  onSelect,
  onMove,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);
  const paletteById = new Map(palette.map((item) => [item.id, item]));

  const toRatio = (event: PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    onSelect?.(id);
    if (!onMove) return;
    draggingRef.current = id;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (draggingRef.current !== id || !onMove) return;
    const point = toRatio(event);
    if (point) onMove(id, round3(point.x), round3(point.y));
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={() => onSelect?.(null)}
      className={cn('relative w-full select-none overflow-hidden rounded-md border bg-white', className)}
      style={{ aspectRatio: String(aspectRatio) }}
    >
      {baseUrl ? (
        <img src={baseUrl} alt="ステージの下絵" className="pointer-events-none absolute inset-0 size-full" draggable={false} />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] bg-size-[10%_10%]" />
      )}
      {items.map((item) => {
        const paletteItem = paletteById.get(item.paletteId);
        if (!paletteItem) return null;
        const selected = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label || paletteItem.label}
            onPointerDown={(event) => handlePointerDown(event, item.id)}
            onPointerMove={(event) => handlePointerMove(event, item.id)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              'absolute flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center',
              onMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
            )}
            style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${iconScale * 100}%` }}
          >
            <span className={cn('block aspect-square w-full rounded-md bg-white/70', selected && 'ring-2 ring-primary')}>
              <SvgIconNodes nodes={paletteItem.nodes} color={paletteItem.color || '#111827'} size="100%" />
            </span>
            {(item.label || paletteItem.label) && (
              <span className="pointer-events-none mt-0.5 whitespace-nowrap rounded bg-white/80 px-1 text-[10px] leading-tight text-foreground sm:text-xs">
                {item.label || paletteItem.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}
