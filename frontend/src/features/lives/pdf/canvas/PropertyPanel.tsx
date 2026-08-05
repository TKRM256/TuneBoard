/** Right-side property editor for the currently selected element(s).
 *  Shows position/size/typography and (for tables/fields) the data binding. */
import { useMemo } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { CanvasElement, FieldElement, TableColumn, TableElement, TextElement } from '../canvas-schema';
import type { FieldCatalog } from '../field-catalog';
import { ExpressionTextarea } from './ExpressionInputs';
import {
  BackgroundBorderGroup,
  ColorInput,
  FieldGroup,
  NumberField,
  TypographyGroup,
} from './property-fields';
import { TablePropertyPanel, type TableFitProps } from './TablePropertyPanel';

interface Props extends TableFitProps {
  element: CanvasElement | null;
  catalog: FieldCatalog;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onUpdateColumn: (columnId: string, patch: Partial<TableColumn>) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
}

export function PropertyPanel({
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
  if (!element) {
    return (
      <aside className="flex h-full w-full items-center justify-center border-l bg-background p-4 text-center text-xs text-muted-foreground">
        要素を選択するとプロパティを編集できます。
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-l bg-background overflow-y-scroll">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          プロパティ — {kindLabel(element.kind)}
        </span>
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
            <TablePropertyPanel
              element={element}
              catalog={catalog}
              onUpdate={onUpdate as (p: Partial<TableElement>) => void}
              onUpdateColumn={onUpdateColumn}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
              onMoveColumn={onMoveColumn}
              onFitHeight={onFitHeight}
              isFittingHeight={isFittingHeight}
              fitDisabledReason={fitDisabledReason}
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
                <div className="flex min-w-0 flex-col items-start">
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

function kindLabel(kind: CanvasElement['kind']): string {
  switch (kind) {
    case 'text': return 'テキスト';
    case 'field': return 'フィールド';
    case 'divider': return '区切り線';
    case 'spacer': return 'スペーサー';
    case 'table': return '表';
  }
}
