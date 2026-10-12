/** 選んだ要素の設定（位置・大きさ・表示条件・種類ごとの設定）。 */
import { Separator } from '@/components/ui/separator';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { NumberField } from '../canvas-shared/property-fields';
import type { TableColumn } from '../pdf/canvas-schema';
import type { SettingSheetBlock } from '../types/live-types';
import { ConditionEditor } from './ConditionEditor';
import { VenueMultiProperties } from './VenueMultiProperties';
import { FieldProperties, IconProperties, ShapeProperties, StagePlotProperties, TextProperties } from './VenueKindProperties';
import { VenueTableProperties } from './VenueTableProperties';
import { venueElementKindLabel, type VenueElement } from './venue-form-schema';

interface Props {
  element: VenueElement | null;
  /** 選んでいる要素すべて。2 個以上ならまとめて変える設定を出す */
  selectedElements: VenueElement[];
  catalog: FieldCatalog;
  blocksById: Map<string, SettingSheetBlock>;
  onUpdate: (id: string, patch: Partial<VenueElement>) => void;
  onUpdateSelected: (patch: Partial<VenueElement>) => void;
  onChangeColumns: (elementId: string, change: (columns: TableColumn[]) => TableColumn[]) => void;
}

export function VenuePropertyPanel({ element, selectedElements, catalog, blocksById, onUpdate, onUpdateSelected, onChangeColumns }: Props) {
  if (selectedElements.length > 1) {
    return <VenueMultiProperties elements={selectedElements} catalog={catalog} blocksById={blocksById} onUpdate={onUpdateSelected} />;
  }
  if (!element) return <p className="p-3 text-xs text-muted-foreground">要素を選ぶと、ここで位置や文字の大きさを変えられます</p>;

  const update = (patch: Partial<VenueElement>) => onUpdate(element.id, patch);

  return (
    // Radix の ScrollArea は中身に合わせて横にも広がるので、長い式やエラー文ではみ出さないよう普通の縦スクロールにする
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="min-w-0 space-y-4 p-3 pb-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{venueElementKindLabel(element.kind)}</p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X (mm)" value={element.xMm} step={0.5} onChange={(xMm) => update({ xMm })} />
          <NumberField label="Y (mm)" value={element.yMm} step={0.5} onChange={(yMm) => update({ yMm })} />
          <NumberField label="幅 (mm)" value={element.wMm} step={0.5} onChange={(wMm) => update({ wMm: Math.max(0.5, wMm) })} />
          <NumberField label="高さ (mm)" value={element.hMm} step={0.5} onChange={(hMm) => update({ hMm: Math.max(0.5, hMm) })} />
        </div>
        <Separator />
        {element.kind === 'text' ? <TextProperties element={element} catalog={catalog} onUpdate={update} /> : null}
        {element.kind === 'field' ? <FieldProperties element={element} catalog={catalog} onUpdate={update} /> : null}
        {element.kind === 'table' ? (
          <VenueTableProperties
            element={element}
            catalog={catalog}
            onUpdate={update}
            onChangeColumns={(change) => onChangeColumns(element.id, change)}
          />
        ) : null}
        {element.kind === 'icon' ? <IconProperties element={element} onUpdate={update} /> : null}
        {element.kind === 'shape' ? <ShapeProperties element={element} onUpdate={update} /> : null}
        {element.kind === 'stagePlot' ? <StagePlotProperties element={element} onUpdate={update} /> : null}
        <Separator />
        <ConditionEditor
          catalog={catalog}
          blocksById={blocksById}
          value={element.condition ?? ''}
          onChange={(condition) => update({ condition: condition || undefined })}
        />
      </div>
    </div>
  );
}
