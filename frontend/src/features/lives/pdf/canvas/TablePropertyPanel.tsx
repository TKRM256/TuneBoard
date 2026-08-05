/** Property editor for a table element: data source, columns and how the table
 *  reacts when its content does not fit. */
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MoveVertical, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DEFAULT_MIN_FONT_SIZE_PT, type TableColumn, type TableElement } from '../canvas-schema';
import type { CatalogGroup, FieldCatalog } from '../field-catalog';
import { ExpressionInput } from './ExpressionInputs';
import { ColorInput, FieldGroup, NumberField } from './property-fields';

export interface TableFitProps {
  /** 現在プレビュー中の提出の実データに、選択中の表の高さを合わせる。 */
  onFitHeight?: (elementId: string) => void;
  isFittingHeight?: boolean;
  /** 押せない理由。undefined ならボタンは有効。 */
  fitDisabledReason?: string;
}

interface Props extends TableFitProps {
  element: TableElement;
  catalog: FieldCatalog;
  onUpdate: (p: Partial<TableElement>) => void;
  onUpdateColumn: (columnId: string, patch: Partial<TableColumn>) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
}

export function TablePropertyPanel({
  element,
  catalog,
  onUpdate,
  onUpdateColumn,
  onAddColumn,
  onRemoveColumn,
  onMoveColumn,
  onFitHeight,
  isFittingHeight,
  fitDisabledReason,
}: Props) {
  const groupFieldOptions = useMemo(() => {
    const source = element.source;
    if (source.kind !== 'group') return [] as Array<{ id: string; label: string }>;
    const group = catalog.groups.find((g) => g.id === source.groupId);
    if (!group) return [];
    return group.fields.map((f) => ({ id: f.id, label: f.label }));
  }, [element.source, catalog]);

  const childGroupOptions = useMemo(() => {
    const source = element.source;
    if (source.kind !== 'group') return [];
    const group = catalog.groups.find((g) => g.id === source.groupId);
    return group?.childGroups ?? [];
  }, [element.source, catalog]);

  return (
    <div className="space-y-3">
      <FieldGroup label="データソース">
        <Select
          value={element.source.kind === 'group' ? `group:${element.source.groupId}` : 'fields'}
          onValueChange={(v) => {
            if (v === 'fields') {
              onUpdate({ source: { kind: 'fields', fields: [] } });
            } else {
              const groupId = v.replace('group:', '');
              const group = catalog.groups.find((g) => g.id === groupId);
              onUpdate({ source: { kind: 'group', groupId, fallbackLabel: group?.label } });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fields">単純なフィールドリスト (KV形式)</SelectItem>
            {catalog.groups.map((g) => (
              <SelectItem key={g.id} value={`group:${g.id}`}>
                {g.label} (繰り返し)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldGroup>

      {element.source.kind === 'fields' && (
        <FieldGroup label="表示するフィールド (上から1行ずつ)">
          <FieldsRowEditor element={element} catalog={catalog} onUpdate={onUpdate} />
        </FieldGroup>
      )}

      <FieldGroup label="列">
        <div className="space-y-1.5">
          {element.columns.map((c, columnIndex) => (
            <div key={c.id} className="space-y-1 rounded border p-2">
              <div className="flex items-center gap-1">
                <span className="w-4 shrink-0 text-center text-[10px] text-muted-foreground">{columnIndex + 1}</span>
                <Input
                  value={c.header}
                  placeholder="見出し"
                  onChange={(e) => onUpdateColumn(c.id, { header: e.target.value })}
                  className="h-7 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="左へ移動"
                  aria-label={`${c.header || `列${columnIndex + 1}`} を左へ移動`}
                  disabled={columnIndex === 0}
                  onClick={() => onMoveColumn(c.id, -1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="右へ移動"
                  aria-label={`${c.header || `列${columnIndex + 1}`} を右へ移動`}
                  disabled={columnIndex === element.columns.length - 1}
                  onClick={() => onMoveColumn(c.id, 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="この列を削除"
                  onClick={() => onRemoveColumn(c.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select
                  value={
                    c.fieldId === ''
                      ? element.source.kind === 'fields'
                        ? '__value__'
                        : '__none__'
                      : c.fieldId
                  }
                  onValueChange={(v) => {
                    if (v.startsWith('__group:')) {
                      const groupId = v.slice('__group:'.length, -2);
                      const childGroup = findChildGroup(catalog, groupId);
                      const firstField = childGroup?.fields[0];
                      const defaultFormat = firstField
                        ? `\${mapJoin(item.group('${groupId}').items, (m) -> m.field('${firstField.id}').value, ' / ')}`
                        : `\${count(item.group('${groupId}').items)}`;
                      onUpdateColumn(c.id, { fieldId: v, format: defaultFormat, header: c.header || childGroup?.label || '' });
                    } else {
                      onUpdateColumn(c.id, { fieldId: v === '__value__' || v === '__none__' ? '' : v });
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs w-full">
                    <SelectValue placeholder="フィールド" />
                  </SelectTrigger>
                  <SelectContent className="min-w-0">
                    {element.source.kind === 'group' && (
                      <>
                        <SelectItem value="__index__">行番号 (No)</SelectItem>
                        {groupFieldOptions.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                        {childGroupOptions.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>繰り返しグループ</SelectLabel>
                            {childGroupOptions.map((g) => (
                              <SelectItem key={g.id} value={`__group:${g.id}__`}>
                                {g.label}（{g.fields.length}項目を結合）
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    )}
                    {element.source.kind === 'fields' && (
                      <>
                        <SelectItem value="__label__">フィールド名</SelectItem>
                        <SelectItem value="__value__">フィールド値 (自動)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <NumberField
                  label="幅"
                  inline
                  unit="%"
                  value={Math.round((c.widthRatio ?? 0) * 100)}
                  onChange={(v) => onUpdateColumn(c.id, { widthRatio: Math.max(0.01, v / 100) })}
                />
              </div>
              <ToggleGroup
                type="single"
                size="sm"
                value={c.align ?? 'left'}
                onValueChange={(v) => v && onUpdateColumn(c.id, { align: v as 'left' | 'center' | 'right' })}
                className="w-full"
                variant="outline"
              >
                <ToggleGroupItem value="left" className="flex-1 text-[10px]">左</ToggleGroupItem>
                <ToggleGroupItem value="center" className="flex-1 text-[10px]">中</ToggleGroupItem>
                <ToggleGroupItem value="right" className="flex-1 text-[10px]">右</ToggleGroupItem>
              </ToggleGroup>
              <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                <Checkbox
                  checked={c.shrinkToFit ?? false}
                  onCheckedChange={(v) => onUpdateColumn(c.id, { shrinkToFit: v === true })}
                />
                収まらない時は文字を縮小
              </label>
              {c.shrinkToFit && (
                <NumberField
                  label="最小サイズ"
                  inline
                  unit="pt"
                  step={0.5}
                  value={c.minFontSizePt ?? DEFAULT_MIN_FONT_SIZE_PT}
                  onChange={(v) => onUpdateColumn(c.id, { minFontSizePt: Math.max(1, v) })}
                />
              )}
              <ExpressionInput
                catalog={catalog}
                value={c.format ?? ''}
                placeholder="フォーマット (例: ${value} 名)"
                onChange={(format) => onUpdateColumn(c.id, { format })}
                title={`${c.header || '列'} のフォーマット`}
                // 行ごとに評価される式なので、1 件目を見本にしてプレビューする
                scope={{
                  groupId: element.source.kind === 'group' ? element.source.groupId : undefined,
                  fieldId: c.fieldId,
                }}
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAddColumn} className="w-full gap-1 text-xs">
            <Plus className="size-3.5" /> 列を追加
          </Button>
        </div>
      </FieldGroup>

      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <Checkbox
          checked={element.showHeader !== false}
          onCheckedChange={(v) => onUpdate({ showHeader: v === true })}
        />
        ヘッダー行を表示
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <Checkbox
          checked={element.zebra ?? false}
          onCheckedChange={(v) => onUpdate({ zebra: v === true })}
        />
        交互の背景色 (ゼブラ)
      </label>

      <div className="space-y-1.5 rounded border p-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={element.autoGrow !== false}
            onCheckedChange={(v) => onUpdate({ autoGrow: v === true })}
          />
          内容に合わせて高さを自動拡張
        </label>
        <p className="text-[10px] text-muted-foreground">
          {element.autoGrow !== false
            ? '上の高さは最低値として扱われます。下の要素は押し下げられ、ページに収まらない行は次のページに続きます。'
            : '高さは固定です。入り切らない行は出力されません。'}
        </p>
        {onFitHeight && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1 text-xs"
            disabled={Boolean(fitDisabledReason) || isFittingHeight}
            title={fitDisabledReason}
            onClick={() => onFitHeight(element.id)}
          >
            {isFittingHeight ? <Loader2 className="size-3.5 animate-spin" /> : <MoveVertical className="size-3.5" />}
            現在のデータに高さを合わせる
          </Button>
        )}
      </div>

      <NumberField
        label="フォントサイズ (pt)"
        value={element.fontSizePt}
        step={0.5}
        onChange={(fontSizePt) => onUpdate({ fontSizePt })}
      />
      <FieldGroup label="ヘッダー背景色">
        <ColorInput value={element.headerFill ?? '#e5edf6'} onChange={(headerFill) => onUpdate({ headerFill })} />
      </FieldGroup>
      <FieldGroup label="罫線色">
        <ColorInput value={element.borderColor ?? '#d1d5db'} onChange={(borderColor) => onUpdate({ borderColor })} />
      </FieldGroup>
    </div>
  );
}

function FieldsRowEditor({
  element,
  catalog,
  onUpdate,
}: {
  element: TableElement;
  catalog: FieldCatalog;
  onUpdate: (p: Partial<TableElement>) => void;
}) {
  const allFields = useMemo(() => {
    const flat: Array<{ id: string; label: string }> = [];
    catalog.fields.forEach((f) => flat.push({ id: f.id, label: f.label }));
    catalog.groups.forEach((g) => g.fields.forEach((f) => flat.push({ id: f.id, label: f.label })));
    return flat;
  }, [catalog]);

  if (element.source.kind !== 'fields') return null;
  const fields = element.source.fields;

  return (
    <div className="space-y-1">
      {fields.map((row, i) => (
        <div key={`${row.fieldId}-${i}`} className="flex min-w-0 items-center gap-1">
          <Select
            value={row.fieldId}
            onValueChange={(v) => {
              if (element.source.kind !== 'fields') return;
              const found = allFields.find((f) => f.id === v);
              const next = [...element.source.fields];
              next[i] = { fieldId: v, fallbackLabel: found?.label };
              onUpdate({ source: { kind: 'fields', fields: next } });
            }}
          >
            <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
              <SelectValue placeholder="フィールドを選択" />
            </SelectTrigger>
            <SelectContent>
              {allFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              if (element.source.kind !== 'fields') return;
              const next = element.source.fields.filter((_, idx) => idx !== i);
              onUpdate({ source: { kind: 'fields', fields: next } });
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (element.source.kind !== 'fields') return;
          const first = allFields[0];
          if (!first) return;
          const next = [...element.source.fields, { fieldId: first.id, fallbackLabel: first.label }];
          onUpdate({ source: { kind: 'fields', fields: next } });
        }}
        className="w-full gap-1 text-xs"
      >
        <Plus className="size-3.5" /> 行を追加
      </Button>
    </div>
  );
}

function findChildGroup(catalog: FieldCatalog, groupId: string): CatalogGroup | undefined {
  const search = (groups: CatalogGroup[]): CatalogGroup | undefined => {
    for (const g of groups) {
      if (g.id === groupId) return g;
      const found = search(g.childGroups);
      if (found) return found;
    }
    return undefined;
  };
  return search(catalog.groups);
}
