/** エディタ上の罫線つきの表。見出しの行と、何を何行書くかの目安だけを見せる（実際の行は提出ごとに変わる）。 */
import type { FieldCatalog } from '../canvas-shared/field-catalog';
import type { VenueGridElement } from './venue-form-schema';

interface Props {
  element: VenueGridElement;
  catalog: FieldCatalog;
  fontPx: number;
}

export function GridPreview({ element, catalog, fontPx }: Props) {
  const border = element.borderColor || '#d1d5db';
  const totalRatio = element.columns.reduce((sum, column) => sum + Math.max(0, column.widthRatio), 0) || 1;
  const source = element.source;
  const sourceLabel = source.kind === 'group'
    ? catalog.labelById.get(source.groupId)?.label ?? source.fallbackLabel ?? 'グループ'
    : `${source.fields.length}個の項目`;
  return (
    <div className="flex size-full flex-col overflow-hidden bg-white text-slate-900" style={{ border: `1px solid ${border}`, fontSize: fontPx }}>
      {element.showHeader !== false ? (
        <div className="flex shrink-0" style={{ background: element.headerFill || '#e5edf6', borderBottom: `1px solid ${border}` }}>
          {element.columns.map((column) => (
            <div
              key={column.id}
              className="truncate px-0.5 font-semibold"
              style={{ width: `${(Math.max(0, column.widthRatio) / totalRatio) * 100}%`, textAlign: column.align ?? 'left', borderRight: `1px solid ${border}` }}
            >
              {column.header}
            </div>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 p-1 text-[10px] leading-tight text-slate-500">
        <p>{sourceLabel}を 1 行ずつ書きます</p>
        <p>{element.autoGrow !== false ? '行が多いと下へ伸びます' : '枠に入る行だけ書きます'}</p>
      </div>
    </div>
  );
}
