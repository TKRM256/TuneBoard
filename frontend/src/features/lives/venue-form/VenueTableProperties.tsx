/** 表（グループを行ごとに書く）の設定。行数と開始位置で、書式の決まった枠に合わせる。 */
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { ExpressionInput } from '../canvas-shared/expression/ExpressionInputs';
import { ColorInput, FieldGroup, NumberField } from '../canvas-shared/property-fields';
import type { TableColumn } from './table-schema';
import { columnOps } from './venue-form-ops';
import type { VenueTableElement } from './venue-form-schema';

interface Props {
  element: VenueTableElement;
  catalog: FieldCatalog;
  onUpdate: (patch: Partial<VenueTableElement>) => void;
  onChangeColumns: (change: (columns: TableColumn[]) => TableColumn[]) => void;
}

export function VenueTableProperties({ element, catalog, onUpdate, onChangeColumns }: Props) {
  const group = catalog.groups.find((g) => g.id === element.groupId);
  const fieldOptions = [{ id: '__index__', label: '番号' }, ...(group?.fields ?? []).map((f) => ({ id: f.id, label: f.label }))];

  return (
    <div className="space-y-3">
      <FieldGroup label="書くグループ">
        <Select value={element.groupId} onValueChange={(groupId) => onUpdate({ groupId })}>
          <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="グループを選ぶ" /></SelectTrigger>
          <SelectContent>
            {catalog.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.pathLabel || g.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="何件目から" value={element.startIndex} onChange={(v) => onUpdate({ startIndex: clampInt(v, 1, 1000) })} />
        <NumberField label="行数" value={element.maxRows} onChange={(v) => onUpdate({ maxRows: clampInt(v, 1, 200) })} />
        <NumberField label="文字 (pt)" value={element.fontSizePt} step={0.5} onChange={(v) => onUpdate({ fontSizePt: Math.max(3, v) })} />
      </div>
      <FieldGroup label="文字色">
        <ColorInput value={element.color ?? '#111827'} onChange={(color) => onUpdate({ color })} />
      </FieldGroup>

      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">列</Label>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onChangeColumns(columnOps.add)}>
          <Plus className="size-3.5" />列を追加
        </Button>
      </div>
      {element.columns.map((column, index) => (
        <div key={column.id} className="space-y-2 rounded-md border p-2">
          <div className="flex items-center gap-1">
            <Select value={column.fieldId || '__none__'} onValueChange={(fieldId) => onChangeColumns(columnOps.update(column.id, { fieldId: fieldId === '__none__' ? '' : fieldId }))}>
              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">式で決める</SelectItem>
                {fieldOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => onChangeColumns(columnOps.move(column.id, -1))} aria-label="左へ">
              <ArrowUp className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" disabled={index === element.columns.length - 1} onClick={() => onChangeColumns(columnOps.move(column.id, 1))} aria-label="右へ">
              <ArrowDown className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onChangeColumns(columnOps.remove(column.id))} aria-label="列を消す">
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="幅の比率" value={column.widthRatio} step={0.05} onChange={(v) => onChangeColumns(columnOps.update(column.id, { widthRatio: Math.max(0.01, v) }))} />
            <FieldGroup label="寄せ">
              <Select value={column.align ?? 'left'} onValueChange={(align) => onChangeColumns(columnOps.update(column.id, { align: align as TableColumn['align'] }))}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">左</SelectItem>
                  <SelectItem value="center">中央</SelectItem>
                  <SelectItem value="right">右</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>
          <Label className="flex items-center gap-2 text-xs font-normal">
            <Checkbox checked={column.shrinkToFit === true} onCheckedChange={(checked) => onChangeColumns(columnOps.update(column.id, { shrinkToFit: checked === true }))} />
            はみ出すときは文字を小さくする
          </Label>
          <ExpressionInput
            catalog={catalog}
            value={column.format ?? ''}
            onChange={(format) => onChangeColumns(columnOps.update(column.id, { format: format || undefined }))}
            placeholder="例: ${value}"
            title="列の書式"
            scope={{ groupId: element.groupId, fieldId: column.fieldId }}
          />
        </div>
      ))}
    </div>
  );
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
