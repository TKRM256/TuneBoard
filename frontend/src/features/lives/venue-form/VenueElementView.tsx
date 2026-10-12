/** エディタ上での要素の見た目。書式の上で位置を合わせやすいよう、文字の大きさも縮尺どおりにする。 */
import type { CSSProperties, ReactNode } from 'react';
import { Filter, LayoutGrid } from 'lucide-react';

import { SvgIconNodes } from '@/features/stage-plot/SvgIconNodes';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { ShrinkToFitLine } from './ShrinkToFitLine';
import { ConditionDim, LiveText } from './VenueLivePreview';
import {
  DEFAULT_TEXT_COLOR,
  type VenueElement,
  type VenueFieldElement,
  type VenueTableElement,
  type VenueTextElement,
} from './venue-form-schema';

const MM_PER_PT = 25.4 / 72;
/** 1 行に縮めるときの下限（出力と同じ）。 */
const MIN_SHRINK_PT = 4;

interface Props {
  element: VenueElement;
  catalog: FieldCatalog;
  pxPerMm: number;
  selected: boolean;
}

export function VenueElementView({ element, catalog, pxPerMm, selected }: Props) {
  return (
    <div className="relative size-full" style={{ outline: selected ? '1.5px dashed #2563eb' : '1px dashed rgba(37,99,235,0.35)' }}>
      <ConditionDim condition={element.condition}>
        <ElementBody element={element} catalog={catalog} pxPerMm={pxPerMm} />
      </ConditionDim>
      {element.condition?.trim() ? (
        <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white" title="表示条件あり">
          <Filter className="size-2.5" />
        </span>
      ) : null}
    </div>
  );
}

function ElementBody({ element, catalog, pxPerMm }: { element: VenueElement; catalog: FieldCatalog; pxPerMm: number }) {
  const fontPx = (pt: number) => Math.max(4, pt * MM_PER_PT * pxPerMm);
  switch (element.kind) {
    case 'text':
      return (
        <TextBody element={element} fontPx={fontPx(element.fontSizePt)} minFontPx={fontPx(MIN_SHRINK_PT)}>
          {element.content ? <LiveText template={element.content} catalog={catalog} /> : <span className="italic text-muted-foreground">(テキスト)</span>}
        </TextBody>
      );
    case 'field':
      return (
        <TextBody element={element} fontPx={fontPx(element.fontSizePt)} minFontPx={fontPx(MIN_SHRINK_PT)}>
          {element.fieldId
            ? <LiveText template={`\${fields['${element.fieldId}'].value}`} catalog={catalog} />
            : '(項目未設定)'}
        </TextBody>
      );
    case 'table':
      return <TableGuide element={element} catalog={catalog} fontPx={fontPx(element.fontSizePt)} />;
    case 'icon':
      return (
        <div className="flex size-full items-center justify-center">
          <SvgIconNodes nodes={element.nodes} color={element.color} size="100%" strokeWidth={element.strokeWidth ?? 2} />
        </div>
      );
    case 'shape':
      return (
        <svg className="size-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          {element.shape === 'line' ? (
            <line x1="0" y1="50" x2="100" y2="50" stroke={element.strokeColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ) : element.shape === 'rect' ? (
            <rect x="0" y="0" width="100" height="100" fill={element.fillColor ?? 'none'} stroke={element.strokeColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ) : (
            <ellipse cx="50" cy="50" rx="50" ry="50" fill={element.fillColor ?? 'none'} stroke={element.strokeColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
      );
    case 'stagePlot': {
      const label = catalog.labelById.get(element.fieldId)?.label ?? '(配置図未設定)';
      return (
        <div className="flex size-full flex-col items-center justify-center gap-1 bg-sky-500/10 text-sky-700">
          <LayoutGrid className="size-5" />
          <span className="text-[10px]">{label}（{element.mode === 'withBase' ? '下絵ごと' : 'アイコンだけ'}）</span>
        </div>
      );
    }
  }
}

/** テキスト・項目の中身。1 行に縮める設定なら折り返さずに縮めて見せる。 */
function TextBody({ element, fontPx, minFontPx, children }: {
  element: VenueTextElement | VenueFieldElement;
  fontPx: number;
  minFontPx: number;
  children: ReactNode;
}) {
  return (
    <div style={textStyle(element, fontPx)}>
      {element.shrinkToFit
        ? <ShrinkToFitLine fontPx={fontPx} minFontPx={minFontPx} align={element.align}>{children}</ShrinkToFitLine>
        : children}
    </div>
  );
}

function TableGuide({ element, catalog, fontPx }: { element: VenueTableElement; catalog: FieldCatalog; fontPx: number }) {
  const rows = Math.max(1, element.maxRows);
  const totalRatio = element.columns.reduce((sum, column) => sum + Math.max(0, column.widthRatio), 0) || 1;
  const label = (fieldId: string) => (fieldId === '__index__' ? '番号' : catalog.labelById.get(fieldId)?.label ?? '?');
  return (
    <div className="flex size-full flex-col bg-emerald-500/5" style={{ fontSize: fontPx, color: element.color ?? DEFAULT_TEXT_COLOR }}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex min-h-0 flex-1 border-b border-dashed border-emerald-500/40 last:border-b-0">
          {element.columns.map((column) => (
            <div
              key={column.id}
              className="flex items-center overflow-hidden whitespace-nowrap border-r border-dashed border-emerald-500/40 px-0.5 last:border-r-0"
              style={{ width: `${(Math.max(0, column.widthRatio) / totalRatio) * 100}%` }}
            >
              {rowIndex === 0 ? <span className="opacity-60">{label(column.fieldId)}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function textStyle(element: { bold?: boolean; align?: string; verticalAlign?: string; color?: string }, fontSize: number): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    fontSize,
    lineHeight: 1.2,
    fontWeight: element.bold ? 700 : 400,
    color: element.color || DEFAULT_TEXT_COLOR,
    display: 'flex',
    alignItems: element.verticalAlign === 'top' ? 'flex-start' : element.verticalAlign === 'bottom' ? 'flex-end' : 'center',
    justifyContent: element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start',
    textAlign: (element.align as CSSProperties['textAlign']) ?? 'left',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    background: 'rgba(37,99,235,0.06)',
  };
}
