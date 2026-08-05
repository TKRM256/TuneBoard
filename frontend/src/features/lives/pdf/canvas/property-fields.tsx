/** Small form controls shared by the property panels. */
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function NumberField({
  label,
  value,
  step = 1,
  inline = false,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  inline?: boolean;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const input = (
    <Input
      type="number"
      value={value}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n)) return;
        onChange(n);
      }}
      className={inline ? 'h-7 text-xs' : 'h-8 text-xs'}
    />
  );

  if (inline) {
    return (
      <div className="flex items-center gap-1">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        {input}
        <p>{unit}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {input}
    </div>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

export function ColorInputWithClear({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
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

export function TypographyGroup({
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

export function BackgroundBorderGroup({
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
