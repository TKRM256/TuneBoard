/** Right-side property editor for the currently selected element(s).
 *  Shows position/size/typography and (for tables/fields) the data binding. */
import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  CanvasElement,
  FieldElement,
  TableColumn,
  TableElement,
  TextElement,
} from '../canvas-schema';
import type { FieldCatalog } from '../field-catalog';
import { ExpressionInput, ExpressionTextarea } from './ExpressionInputs';

interface Props {
  element: CanvasElement | null;
  catalog: FieldCatalog;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onUpdateColumn: (columnId: string, patch: Partial<TableColumn>) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
}

export function PropertyPanel({ element, catalog, onUpdate, onUpdateColumn, onAddColumn, onRemoveColumn }: Props) {
  if (!element) {
    return (
      <aside className="flex h-full w-full items-center justify-center border-l bg-background p-4 text-center text-xs text-muted-foreground">
        要素を選択するとプロパティを編集できます。
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-l bg-background">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        プロパティ — {kindLabel(element.kind)}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          <PositionFields element={element} onUpdate={onUpdate} />
          <Separator />
          {element.kind === 'text' && <TextProperties element={element} catalog={catalog} onUpdate={onUpdate as (p: Partial<TextElement>) => void} />}
          {element.kind === 'field' && (
            <FieldProperties
              element={element}
              catalog={catalog}
              onUpdate={onUpdate as (p: Partial<FieldElement>) => void}
            />
          )}
          {element.kind === 'divider' && <DividerProperties element={element} onUpdate={onUpdate} />}
          {element.kind === 'table' && (
            <TableProperties
              element={element}
              catalog={catalog}
              onUpdate={onUpdate as (p: Partial<TableElement>) => void}
              onUpdateColumn={onUpdateColumn}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
            />
          )}
          {element.kind === 'spacer' && (
            <p className="text-xs text-muted-foreground">スペーサーは PDF には出力されません。</p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function PositionFields({ element, onUpdate }: { element: CanvasElement; onUpdate: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">位置とサイズ (mm)</Label>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={element.xMm} onChange={(v) => onUpdate({ xMm: v })} />
        <NumberField label="Y" value={element.yMm} onChange={(v) => onUpdate({ yMm: v })} />
        <NumberField label="幅" value={element.wMm} onChange={(v) => onUpdate({ wMm: Math.max(1, v) })} />
        <NumberField label="高さ" value={element.hMm} onChange={(v) => onUpdate({ hMm: Math.max(1, v) })} />
      </div>
    </div>
  );
}

function TextProperties({ element, catalog, onUpdate }: { element: TextElement; catalog: FieldCatalog; onUpdate: (p: Partial<TextElement>) => void }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="テキスト内容">
        <ExpressionTextarea
          catalog={catalog}
          value={element.content}
          onChange={(content) => onUpdate({ content })}
          rows={3}
        />
        <p className="text-[10px] text-muted-foreground">
          {`\${...} で式が使えます。右下の「式を挿入」から変数や join などのヘルパーを呼び出せます。`}
        </p>
      </FieldGroup>
      <TypographyGroup
        fontSize={element.fontSizePt}
        bold={element.bold}
        italic={element.italic}
        align={element.align}
        verticalAlign={element.verticalAlign}
        color={element.color}
        onUpdate={(p) => onUpdate(p)}
      />
      <BackgroundBorderGroup
        backgroundColor={element.backgroundColor}
        borderColor={element.borderColor}
        borderThicknessPt={element.borderThicknessPt}
        onUpdate={(p) => onUpdate(p)}
      />
    </div>
  );
}

function FieldProperties({ element, catalog, onUpdate }: { element: FieldElement; catalog: FieldCatalog; onUpdate: (p: Partial<FieldElement>) => void }) {
  const allFields = useMemo(() => {
    const out: { id: string; label: string; path: string }[] = [];
    catalog.fields.forEach((f) => out.push({ id: f.id, label: f.label, path: f.pathLabel }));
    catalog.groups.forEach((g) => g.fields.forEach((f) => out.push({ id: f.id, label: f.label, path: f.pathLabel })));
    return out;
  }, [catalog]);

  return (
    <div className="space-y-3">
      <FieldGroup label="参照フィールド">
        <Select
          value={element.fieldId}
          onValueChange={(v) => {
            const found = allFields.find((f) => f.id === v);
            onUpdate({ fieldId: v, fallbackLabel: found?.label });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="フィールドを選択" />
          </SelectTrigger>
          <SelectContent>
            {allFields.length === 0 && (
              <SelectItem value="__none__" disabled>
                利用できるフィールドがありません
              </SelectItem>
            )}
            {allFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <div className="flex flex-col items-start">
                  <span>{f.label}</span>
                  <span className="text-[10px] text-muted-foreground">{f.path}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldGroup>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <Checkbox
          checked={element.showLabel ?? false}
          onCheckedChange={(v) => onUpdate({ showLabel: v === true })}
        />
        ラベルを表示する (例: "氏名: 田中")
      </label>
      <FieldGroup label="表示ラベル (任意)">
        <Input
          value={element.labelOverride ?? ''}
          placeholder={element.fallbackLabel ?? element.fieldId}
          onChange={(e) => onUpdate({ labelOverride: e.target.value })}
        />
      </FieldGroup>
      <TypographyGroup
        fontSize={element.fontSizePt}
        bold={element.bold}
        align={element.align}
        verticalAlign={element.verticalAlign}
        color={element.color}
        onUpdate={(p) => onUpdate(p)}
      />
      <BackgroundBorderGroup
        backgroundColor={element.backgroundColor}
        borderColor={element.borderColor}
        borderThicknessPt={element.borderThicknessPt}
        onUpdate={(p) => onUpdate(p)}
      />
    </div>
  );
}

function DividerProperties({ element, onUpdate }: { element: Extract<CanvasElement, { kind: 'divider' }>; onUpdate: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="色">
        <ColorInput value={element.color ?? '#d1d5db'} onChange={(color) => onUpdate({ color })} />
      </FieldGroup>
      <NumberField
        label="太さ (pt)"
        value={element.thicknessPt ?? 0.6}
        step={0.1}
        onChange={(thicknessPt) => onUpdate({ thicknessPt })}
      />
    </div>
  );
}

function TableProperties({
  element,
  catalog,
  onUpdate,
  onUpdateColumn,
  onAddColumn,
  onRemoveColumn,
}: {
  element: TableElement;
  catalog: FieldCatalog;
  onUpdate: (p: Partial<TableElement>) => void;
  onUpdateColumn: (columnId: string, patch: Partial<TableColumn>) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
}) {
  const groupFieldOptions = useMemo(() => {
    const source = element.source;
    if (source.kind !== 'group') return [] as Array<{ id: string; label: string }>;
    const group = catalog.groups.find((g) => g.id === source.groupId);
    if (!group) return [];
    return group.fields.map((f) => ({ id: f.id, label: f.label }));
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
          <FieldsRowEditor
            element={element}
            catalog={catalog}
            onUpdate={onUpdate}
          />
        </FieldGroup>
      )}

      <FieldGroup label="列">
        <div className="space-y-1.5">
          {element.columns.map((c) => (
            <div key={c.id} className="space-y-1 rounded border p-2">
              <div className="flex items-center gap-1">
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
                  onClick={() => onRemoveColumn(c.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={c.fieldId || '__none__'} onValueChange={(v) => onUpdateColumn(c.id, { fieldId: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="フィールド" />
                  </SelectTrigger>
                  <SelectContent>
                    {element.source.kind === 'group' && (
                      <>
                        <SelectItem value="__index__">行番号 (No)</SelectItem>
                        {groupFieldOptions.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {element.source.kind === 'fields' && (
                      <>
                        <SelectItem value="__label__">フィールド名</SelectItem>
                        <SelectItem value="">フィールド値 (自動)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <NumberField
                  label="幅 %"
                  inline
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
              <ExpressionInput
                catalog={catalog}
                value={c.format ?? ''}
                placeholder="フォーマット (例: ${value} 名)"
                onChange={(format) => onUpdateColumn(c.id, { format })}
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
        <div key={`${row.fieldId}-${i}`} className="flex items-center gap-1">
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
            <SelectTrigger className="h-7 text-xs">
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

function TypographyGroup({
  fontSize,
  bold,
  italic,
  align,
  verticalAlign,
  color,
  onUpdate,
}: {
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  align?: string;
  verticalAlign?: string;
  color?: string;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">文字</Label>
      <NumberField label="サイズ (pt)" value={fontSize} step={0.5} onChange={(fontSizePt) => onUpdate({ fontSizePt })} />
      <div className="flex gap-1">
        <ToggleGroup
          type="multiple"
          size="sm"
          variant="outline"
          value={[bold ? 'bold' : '', italic ? 'italic' : ''].filter(Boolean)}
          onValueChange={(values) => onUpdate({ bold: values.includes('bold'), italic: values.includes('italic') })}
        >
          <ToggleGroupItem value="bold" className="text-xs font-bold">B</ToggleGroupItem>
          <ToggleGroupItem value="italic" className="text-xs italic">I</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={align ?? 'left'}
          onValueChange={(v) => v && onUpdate({ align: v })}
        >
          <ToggleGroupItem value="left" className="text-[10px]">左</ToggleGroupItem>
          <ToggleGroupItem value="center" className="text-[10px]">中</ToggleGroupItem>
          <ToggleGroupItem value="right" className="text-[10px]">右</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={verticalAlign ?? 'top'}
        onValueChange={(v) => v && onUpdate({ verticalAlign: v })}
      >
        <ToggleGroupItem value="top" className="text-[10px]">上寄せ</ToggleGroupItem>
        <ToggleGroupItem value="middle" className="text-[10px]">中央</ToggleGroupItem>
        <ToggleGroupItem value="bottom" className="text-[10px]">下寄せ</ToggleGroupItem>
      </ToggleGroup>
      <FieldGroup label="文字色">
        <ColorInput value={color ?? '#111827'} onChange={(c) => onUpdate({ color: c })} />
      </FieldGroup>
    </div>
  );
}

function BackgroundBorderGroup({
  backgroundColor,
  borderColor,
  borderThicknessPt,
  onUpdate,
}: {
  backgroundColor?: string;
  borderColor?: string;
  borderThicknessPt?: number;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">背景・枠</Label>
      <FieldGroup label="背景色">
        <ColorInputWithClear value={backgroundColor} onChange={(c) => onUpdate({ backgroundColor: c })} />
      </FieldGroup>
      <FieldGroup label="枠線色">
        <ColorInputWithClear value={borderColor} onChange={(c) => onUpdate({ borderColor: c })} />
      </FieldGroup>
      <NumberField
        label="枠線の太さ (pt)"
        value={borderThicknessPt ?? 0.5}
        step={0.1}
        onChange={(borderThicknessPt) => onUpdate({ borderThicknessPt })}
      />
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({ label, value, step = 1, inline = false, onChange }: { label: string; value: number; step?: number; inline?: boolean; onChange: (v: number) => void }) {
  if (inline) {
    return (
      <div className="flex items-center gap-1">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        <Input
          type="number"
          value={value}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange(n);
          }}
          className="h-7 text-xs"
        />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(n);
        }}
        className="h-8 text-xs"
      />
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 font-mono text-xs" />
    </div>
  );
}

function ColorInputWithClear({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value ?? '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border"
      />
      <Input
        value={value ?? ''}
        placeholder="(なし)"
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-7 font-mono text-xs"
      />
      {value && (
        <Button variant="ghost" size="icon" className="size-7" onClick={() => onChange(undefined)}>
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

function kindLabel(kind: CanvasElement['kind']): string {
  switch (kind) {
    case 'text': return 'テキスト';
    case 'field': return 'フィールド';
    case 'divider': return '区切り線';
    case 'spacer': return 'スペーサー';
    case 'table': return '表';
  }
}
