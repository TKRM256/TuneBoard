/** 複数選んだ要素の設定。どの要素にもある設定だけを出し、変えると選んだ要素すべてに当てる。値がばらばらの欄は空にしておく。 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { FieldGroup } from '../canvas-shared/property-fields';
import type { SettingSheetBlock } from '../types/live-types';
import { ConditionEditor } from './ConditionEditor';
import { allOfKind, COLOR_KINDS, colorOf, commonValue, FONT_KINDS, TEXT_KINDS } from './multi-edit';
import type { VenueElement } from './venue-form-schema';

interface Props {
  elements: VenueElement[];
  catalog: FieldCatalog;
  blocksById: Map<string, SettingSheetBlock>;
  onUpdate: (patch: Partial<VenueElement>) => void;
}

export function VenueMultiProperties({ elements, catalog, blocksById, onUpdate }: Props) {
  const update = (patch: Record<string, unknown>) => onUpdate(patch as Partial<VenueElement>);
  const value = <T,>(get: (element: VenueElement) => T) => commonValue(elements, get);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="min-w-0 space-y-4 p-3 pb-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{elements.length}個を選択中</p>
        <div className="grid grid-cols-2 gap-2">
          <MixedNumberField label="X (mm)" value={value((e) => e.xMm)} step={0.5} onChange={(xMm) => update({ xMm })} />
          <MixedNumberField label="Y (mm)" value={value((e) => e.yMm)} step={0.5} onChange={(yMm) => update({ yMm })} />
          <MixedNumberField label="幅 (mm)" value={value((e) => e.wMm)} step={0.5} onChange={(wMm) => update({ wMm: Math.max(0.5, wMm) })} />
          <MixedNumberField label="高さ (mm)" value={value((e) => e.hMm)} step={0.5} onChange={(hMm) => update({ hMm: Math.max(0.5, hMm) })} />
        </div>
        <TextSection elements={elements} onUpdate={update} />
        <ShapeSection elements={elements} onUpdate={update} />
        <Separator />
        <ConditionEditor
          catalog={catalog}
          blocksById={blocksById}
          value={value((e) => e.condition ?? '') ?? ''}
          mixed={value((e) => e.condition ?? '') === undefined}
          onChange={(condition) => update({ condition: condition || undefined })}
        />
      </div>
    </div>
  );
}

type Update = (patch: Record<string, unknown>) => void;

function TextSection({ elements, onUpdate }: { elements: VenueElement[]; onUpdate: Update }) {
  const hasFont = allOfKind(elements, FONT_KINDS);
  const hasColor = allOfKind(elements, COLOR_KINDS);
  if (!hasFont && !hasColor) return null;
  const textOnly = allOfKind(elements, TEXT_KINDS) ? elements : null;
  return (
    <>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{hasFont ? '文字' : '色'}</Label>
        {hasFont ? (
          <MixedNumberField label="サイズ (pt)" value={commonValue(elements, (e) => e.fontSizePt)} step={0.5} onChange={(v) => onUpdate({ fontSizePt: Math.max(1, v) })} />
        ) : null}
        {textOnly ? (
          <>
            <div className="flex gap-1">
              <ToggleGroup
                type="multiple"
                size="sm"
                variant="outline"
                value={commonValue(textOnly, (e) => Boolean(e.bold)) ? ['bold'] : []}
                onValueChange={(values) => onUpdate({ bold: values.includes('bold') })}
              >
                <ToggleGroupItem value="bold" className="text-xs font-bold">B</ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={commonValue(textOnly, (e) => e.align ?? 'left') ?? ''}
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
              value={commonValue(textOnly, (e) => e.verticalAlign ?? 'middle') ?? ''}
              onValueChange={(v) => v && onUpdate({ verticalAlign: v })}
            >
              <ToggleGroupItem value="top" className="text-[10px]">上寄せ</ToggleGroupItem>
              <ToggleGroupItem value="middle" className="text-[10px]">中央</ToggleGroupItem>
              <ToggleGroupItem value="bottom" className="text-[10px]">下寄せ</ToggleGroupItem>
            </ToggleGroup>
          </>
        ) : null}
        {hasColor ? (
          <FieldGroup label={hasFont ? '文字色' : '色'}>
            <MixedColorField value={commonValue(elements, colorOf)} onChange={(color) => onUpdate({ color })} />
          </FieldGroup>
        ) : null}
      </div>
    </>
  );
}

function ShapeSection({ elements, onUpdate }: { elements: VenueElement[]; onUpdate: Update }) {
  if (allOfKind(elements, ['shape'] as const)) {
    return (
      <>
        <Separator />
        <div className="space-y-2">
          <FieldGroup label="線の色">
            <MixedColorField value={commonValue(elements, (e) => e.strokeColor ?? '#dc2626')} onChange={(strokeColor) => onUpdate({ strokeColor })} />
          </FieldGroup>
          <MixedNumberField label="線の太さ (pt)" value={commonValue(elements, (e) => e.strokeWidthPt ?? 1)} step={0.25} onChange={(v) => onUpdate({ strokeWidthPt: Math.max(0, v) })} />
        </div>
      </>
    );
  }
  if (allOfKind(elements, ['icon'] as const)) {
    return (
      <>
        <Separator />
        <MixedNumberField label="線の太さ" value={commonValue(elements, (e) => e.strokeWidth ?? 2)} step={0.5} onChange={(v) => onUpdate({ strokeWidth: Math.max(0.5, v) })} />
      </>
    );
  }
  return null;
}

/** 値がばらばらなら空欄で出す数値の欄。空にしただけでは変えない。 */
function MixedNumberField({ label, value, step, onChange }: { label: string; value: number | undefined; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value ?? ''}
        placeholder="—"
        step={step}
        onChange={(event) => {
          const n = Number(event.target.value);
          if (event.target.value === '' || !Number.isFinite(n)) return;
          onChange(n);
        }}
        className="h-8 text-xs"
      />
    </div>
  );
}

function MixedColorField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value ?? '#000000'}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-9 cursor-pointer rounded border"
      />
      <Input value={value ?? ''} placeholder="—" onChange={(event) => onChange(event.target.value)} className="h-7 font-mono text-xs" />
    </div>
  );
}
