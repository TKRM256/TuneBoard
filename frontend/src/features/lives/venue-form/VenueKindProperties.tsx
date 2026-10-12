/** 要素の種類ごとの設定（表以外）。 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPicker } from '@/features/stage-plot/IconPicker';
import { SvgIconNodes } from '@/features/stage-plot/SvgIconNodes';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { ExpressionTextarea } from '../canvas-shared/expression/ExpressionInputs';
import { BackgroundBorderGroup, ColorInput, ColorInputWithClear, FieldGroup, NumberField, TypographyGroup } from '../canvas-shared/property-fields';
import type {
  ShapeKind,
  StagePlotMode,
  VenueFieldElement,
  VenueIconElement,
  VenueShapeElement,
  VenueStagePlotElement,
  VenueTextElement,
} from './venue-form-schema';

type Update<T> = (patch: Partial<T>) => void;

export function TextProperties({ element, catalog, onUpdate }: { element: VenueTextElement; catalog: FieldCatalog; onUpdate: Update<VenueTextElement> }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="内容">
        <ExpressionTextarea catalog={catalog} value={element.content} onChange={(content) => onUpdate({ content })} rows={3} title="テキスト" />
      </FieldGroup>
      <TypographyGroup {...typography(element)} onUpdate={onUpdate as (patch: Record<string, unknown>) => void} />
      <ShrinkToFitSwitch checked={element.shrinkToFit === true} onChange={(shrinkToFit) => onUpdate({ shrinkToFit })} />
      <BackgroundBorderGroup {...boxStyle(element)} onUpdate={onUpdate as (patch: Record<string, unknown>) => void} />
    </div>
  );
}

export function FieldProperties({ element, catalog, onUpdate }: { element: VenueFieldElement; catalog: FieldCatalog; onUpdate: Update<VenueFieldElement> }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="項目">
        <Select value={element.fieldId} onValueChange={(fieldId) => onUpdate({ fieldId })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="項目を選ぶ" /></SelectTrigger>
          <SelectContent>
            {catalog.fields
              .filter((field) => field.type !== 'STAGE_PLOT')
              .map((field) => <SelectItem key={field.id} value={field.id}>{field.pathLabel}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldGroup>
      <div className="flex items-center gap-2">
        <Switch id="show-label" checked={element.showLabel === true} onCheckedChange={(showLabel) => onUpdate({ showLabel })} />
        <Label htmlFor="show-label" className="text-xs">項目名を前に付ける</Label>
      </div>
      {element.showLabel ? (
        <FieldGroup label="付ける名前">
          <Input
            className="h-8 text-xs"
            value={element.labelOverride ?? ''}
            placeholder={catalog.labelById.get(element.fieldId)?.label ?? '項目名'}
            onChange={(event) => onUpdate({ labelOverride: event.target.value || undefined })}
          />
        </FieldGroup>
      ) : null}
      <TypographyGroup {...typography(element)} onUpdate={onUpdate as (patch: Record<string, unknown>) => void} />
      <ShrinkToFitSwitch checked={element.shrinkToFit === true} onChange={(shrinkToFit) => onUpdate({ shrinkToFit })} />
      <BackgroundBorderGroup {...boxStyle(element)} onUpdate={onUpdate as (patch: Record<string, unknown>) => void} />
    </div>
  );
}

/** 折り返さずに 1 行で枠の幅に収まるまで文字を小さくするか。 */
export function ShrinkToFitSwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id="shrink-to-fit" checked={checked} onCheckedChange={onChange} />
      <Label htmlFor="shrink-to-fit" className="text-xs">1 行に縮めて収める</Label>
    </div>
  );
}

export function IconProperties({ element, onUpdate }: { element: VenueIconElement; onUpdate: Update<VenueIconElement> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <SvgIconNodes nodes={element.nodes} color={element.color} size={32} strokeWidth={element.strokeWidth ?? 2} />
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>アイコンを変える</Button>
      </div>
      <FieldGroup label="色">
        <ColorInput value={element.color ?? '#dc2626'} onChange={(color) => onUpdate({ color })} />
      </FieldGroup>
      <NumberField label="線の太さ" value={element.strokeWidth ?? 2} step={0.5} onChange={(v) => onUpdate({ strokeWidth: Math.max(0.5, v) })} />
      <IconPicker open={open} onOpenChange={setOpen} onSelect={(icon) => onUpdate({ iconName: icon.iconName, nodes: icon.nodes })} />
    </div>
  );
}

export function ShapeProperties({ element, onUpdate }: { element: VenueShapeElement; onUpdate: Update<VenueShapeElement> }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="形">
        <Select value={element.shape} onValueChange={(shape) => onUpdate({ shape: shape as ShapeKind })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ellipse">丸（楕円）</SelectItem>
            <SelectItem value="rect">四角</SelectItem>
            <SelectItem value="line">横線</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>
      <FieldGroup label="線の色">
        <ColorInput value={element.strokeColor ?? '#dc2626'} onChange={(strokeColor) => onUpdate({ strokeColor })} />
      </FieldGroup>
      <NumberField label="線の太さ (pt)" value={element.strokeWidthPt ?? 1} step={0.25} onChange={(v) => onUpdate({ strokeWidthPt: Math.max(0, v) })} />
      {element.shape !== 'line' ? (
        <FieldGroup label="塗り">
          <ColorInputWithClear value={element.fillColor} onChange={(fillColor) => onUpdate({ fillColor })} />
        </FieldGroup>
      ) : null}
    </div>
  );
}

export function StagePlotProperties({ element, onUpdate }: { element: VenueStagePlotElement; onUpdate: Update<VenueStagePlotElement> }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="描き方">
        <Select value={element.mode} onValueChange={(mode) => onUpdate({ mode: mode as StagePlotMode })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="icons">アイコンだけ</SelectItem>
            <SelectItem value="withBase">下絵ごと描く</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>
      {element.groupId ? (
        <NumberField label="何件目の配置図か" value={element.itemIndex ?? 1} onChange={(v) => onUpdate({ itemIndex: Math.max(1, Math.round(v)) })} />
      ) : null}
      <NumberField label="名前の文字 (pt)" value={element.labelFontSizePt ?? 7} step={0.5} onChange={(v) => onUpdate({ labelFontSizePt: Math.max(3, v) })} />
    </div>
  );
}

function boxStyle(element: VenueTextElement | VenueFieldElement) {
  return {
    backgroundColor: element.backgroundColor,
    borderColor: element.borderColor,
    borderThicknessPt: element.borderThicknessPt,
  };
}

function typography(element: VenueTextElement | VenueFieldElement) {
  return {
    fontSize: element.fontSizePt,
    bold: element.bold,
    align: element.align,
    verticalAlign: element.verticalAlign,
    color: element.color,
  };
}
