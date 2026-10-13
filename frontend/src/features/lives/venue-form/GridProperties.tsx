/** 罫線つきの表の設定。書く内容（グループか項目の一覧）、列、見出しと色、行が多いときに伸ばすか。 */
import { ChevronLeft, ChevronRight, Loader2, MoveVertical, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import type { CatalogGroup, FieldCatalog } from '../canvas-shared/field-catalog';
import { ExpressionInput } from '../canvas-shared/expression/ExpressionInputs';
import { ColorInput, FieldGroup, NumberField } from '../canvas-shared/property-fields';
import { GridRowsEditor } from './GridRowsEditor';
import { DEFAULT_MIN_FONT_SIZE_PT, type TableColumn } from './table-schema';
import { columnOps } from './venue-form-ops';
import type { VenueGridElement } from './venue-form-schema';

export interface GridFitProps {
  /** 見本の提出の行数に、表の高さを合わせる */
  onFitHeight?: (elementId: string) => void;
  isFittingHeight?: boolean;
  /** 押せない理由。無ければ押せる */
  fitDisabledReason?: string;
}

interface Props extends GridFitProps {
  element: VenueGridElement;
  catalog: FieldCatalog;
  onUpdate: (patch: Partial<VenueGridElement>) => void;
  onChangeColumns: (change: (columns: TableColumn[]) => TableColumn[]) => void;
}

const FIELDS_SOURCE = '__fields__';

export function GridProperties({ element, catalog, onUpdate, onChangeColumns, onFitHeight, isFittingHeight, fitDisabledReason }: Props) {
  const source = element.source;
  const group = source.kind === 'group' ? findGroup(catalog.groups, source.groupId) : undefined;
  const updateColumn = (columnId: string, patch: Partial<TableColumn>) => onChangeColumns(columnOps.update(columnId, patch));

  return (
    <div className="space-y-3">
      <FieldGroup label="書く内容">
        <Select
          value={source.kind === 'group' ? source.groupId : FIELDS_SOURCE}
          onValueChange={(value) => {
            if (value === FIELDS_SOURCE) {
              onUpdate({ source: { kind: 'fields', fields: [] } });
              return;
            }
            onUpdate({ source: { kind: 'group', groupId: value, fallbackLabel: findGroup(catalog.groups, value)?.label } });
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={FIELDS_SOURCE}>項目を 1 行ずつ並べる</SelectItem>
            {catalog.groups.length > 0 ? (
              <SelectGroup>
                <SelectLabel>グループを 1 件ずつ並べる</SelectLabel>
                {catalog.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.pathLabel || g.label}</SelectItem>)}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
      </FieldGroup>

      {source.kind === 'fields' ? (
        <FieldGroup label="並べる項目">
          <GridRowsEditor rows={source.fields} catalog={catalog} onChange={(fields) => onUpdate({ source: { kind: 'fields', fields } })} />
        </FieldGroup>
      ) : null}

      <FieldGroup label="列">
        <div className="space-y-1.5">
          {element.columns.map((column, index) => (
            <div key={column.id} className="space-y-1 rounded border p-2">
              <div className="flex items-center gap-1">
                <Input value={column.header} aria-label="見出し" onChange={(e) => updateColumn(column.id, { header: e.target.value })} className="h-7 text-xs" />
                <Button variant="ghost" size="icon" className="size-7" aria-label="左へ" disabled={index === 0} onClick={() => onChangeColumns(columnOps.move(column.id, -1))}>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" aria-label="右へ" disabled={index === element.columns.length - 1} onClick={() => onChangeColumns(columnOps.move(column.id, 1))}>
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" aria-label="列を消す" onClick={() => onChangeColumns(columnOps.remove(column.id))}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <ColumnFieldSelect column={column} sourceKind={source.kind} group={group} onChange={(patch) => updateColumn(column.id, patch)} />
                <NumberField label="幅" inline unit="%" value={Math.round((column.widthRatio ?? 0) * 100)} onChange={(v) => updateColumn(column.id, { widthRatio: Math.max(0.01, v / 100) })} />
              </div>
              <ToggleGroup type="single" size="sm" variant="outline" className="w-full" value={column.align ?? 'left'} onValueChange={(v) => v && updateColumn(column.id, { align: v as TableColumn['align'] })}>
                <ToggleGroupItem value="left" className="flex-1 text-[10px]">左</ToggleGroupItem>
                <ToggleGroupItem value="center" className="flex-1 text-[10px]">中</ToggleGroupItem>
                <ToggleGroupItem value="right" className="flex-1 text-[10px]">右</ToggleGroupItem>
              </ToggleGroup>
              <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                <Checkbox checked={column.shrinkToFit ?? false} onCheckedChange={(v) => updateColumn(column.id, { shrinkToFit: v === true })} />
                はみ出すときは文字を小さくする
              </label>
              {column.shrinkToFit ? (
                <NumberField label="いちばん小さい文字" inline unit="pt" step={0.5} value={column.minFontSizePt ?? DEFAULT_MIN_FONT_SIZE_PT} onChange={(v) => updateColumn(column.id, { minFontSizePt: Math.max(1, v) })} />
              ) : null}
              <p className="text-[10px] text-muted-foreground">書式</p>
              <ExpressionInput
                catalog={catalog}
                value={column.format ?? ''}
                onChange={(format) => updateColumn(column.id, { format: format || undefined })}
                title={`${column.header || '列'}の書式`}
                // 行ごとに評価する式なので、1 件目を見本にして見せる
                scope={{ groupId: source.kind === 'group' ? source.groupId : undefined, fieldId: column.fieldId }}
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChangeColumns(columnOps.add)} className="w-full gap-1 text-xs">
            <Plus className="size-3.5" />列を追加
          </Button>
        </div>
      </FieldGroup>

      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <Checkbox checked={element.showHeader !== false} onCheckedChange={(v) => onUpdate({ showHeader: v === true })} />
        見出しの行を出す
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <Checkbox checked={element.zebra ?? false} onCheckedChange={(v) => onUpdate({ zebra: v === true })} />
        1 行おきに色を付ける
      </label>
      <div className="space-y-1.5 rounded border p-2">
        <label className="flex cursor-pointer items-start gap-2 text-xs">
          <Checkbox className="mt-0.5" checked={element.autoGrow !== false} onCheckedChange={(v) => onUpdate({ autoGrow: v === true })} />
          行が多いときは下へ伸ばし、入らない分は次のページに続ける
        </label>
        {onFitHeight ? (
          <Button variant="outline" size="sm" className="w-full gap-1 text-xs" disabled={Boolean(fitDisabledReason) || isFittingHeight} title={fitDisabledReason} onClick={() => onFitHeight(element.id)}>
            {isFittingHeight ? <Loader2 className="size-3.5 animate-spin" /> : <MoveVertical className="size-3.5" />}
            見本の提出に高さを合わせる
          </Button>
        ) : null}
      </div>
      <NumberField label="文字 (pt)" value={element.fontSizePt} step={0.5} onChange={(fontSizePt) => onUpdate({ fontSizePt: Math.max(3, fontSizePt) })} />
      <FieldGroup label="見出しの色">
        <ColorInput value={element.headerFill ?? '#e5edf6'} onChange={(headerFill) => onUpdate({ headerFill })} />
      </FieldGroup>
      <FieldGroup label="線の色">
        <ColorInput value={element.borderColor ?? '#d1d5db'} onChange={(borderColor) => onUpdate({ borderColor })} />
      </FieldGroup>
    </div>
  );
}

const NONE = '__none__';

/** 列に書く値。グループなら番号・グループの項目・入れ子のグループ、項目の一覧なら項目名か値。 */
function ColumnFieldSelect({ column, sourceKind, group, onChange }: {
  column: TableColumn;
  sourceKind: 'group' | 'fields';
  group: CatalogGroup | undefined;
  onChange: (patch: Partial<TableColumn>) => void;
}) {
  return (
    <Select
      value={column.fieldId === '' ? NONE : column.fieldId}
      onValueChange={(value) => {
        if (value.startsWith('__group:')) {
          const childId = value.slice('__group:'.length, -2);
          const child = group?.childGroups.find((g) => g.id === childId);
          const first = child?.fields[0];
          const format = first
            ? `\${mapJoin(item.group('${childId}').items, (m) -> m.field('${first.id}').value, ' / ')}`
            : `\${count(item.group('${childId}').items)}`;
          onChange({ fieldId: value, format, header: column.header || child?.label || '' });
          return;
        }
        onChange({ fieldId: value === NONE ? '' : value });
      }}
    >
      <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
      <SelectContent className="min-w-0">
        {sourceKind === 'group' ? (
          <>
            <SelectItem value={NONE}>式で決める</SelectItem>
            <SelectItem value="__index__">番号</SelectItem>
            {(group?.fields ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
            {group && group.childGroups.length > 0 ? (
              <SelectGroup>
                <SelectLabel>入れ子のグループをまとめる</SelectLabel>
                {group.childGroups.map((g) => <SelectItem key={g.id} value={`__group:${g.id}__`}>{g.label}</SelectItem>)}
              </SelectGroup>
            ) : null}
          </>
        ) : (
          <>
            <SelectItem value="__label__">項目名</SelectItem>
            <SelectItem value={NONE}>値</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

function findGroup(groups: CatalogGroup[], id: string): CatalogGroup | undefined {
  for (const g of groups) {
    if (g.id === id) return g;
    const found = findGroup(g.childGroups, id);
    if (found) return found;
  }
  return undefined;
}
