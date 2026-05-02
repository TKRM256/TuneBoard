/** Sidebar with all PDF layout controls. Emits change events to the parent. */
import { useCallback, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SettingSheetConfigResponse } from '../types/live-types';
import { BlockVisibilityList } from './BlockVisibilityList';
import {
  PDF_DENSITY_OPTIONS,
  PDF_HEADER_FIELD_OPTIONS,
  PDF_ORIENTATION_OPTIONS,
  PDF_PAPER_SIZE_OPTIONS,
  type PdfDensity,
  type PdfHeaderOptions,
  type PdfLayoutOptions,
  type PdfOrientation,
  type PdfPaperSize,
} from './pdf-options';

interface Props {
  config: SettingSheetConfigResponse | null;
  options: PdfLayoutOptions;
  onChange: (options: PdfLayoutOptions) => void;
  onReset: () => void;
}

export function PdfControlPanel({ config, options, onChange, onReset }: Props) {
  const update = useCallback(
    <K extends keyof PdfLayoutOptions>(key: K, value: PdfLayoutOptions[K]) => {
      onChange({ ...options, [key]: value });
    },
    [options, onChange],
  );

  const updateHeader = useCallback(
    (key: keyof PdfHeaderOptions, value: boolean) => {
      onChange({ ...options, header: { ...options.header, [key]: value } });
    },
    [options, onChange],
  );

  const hiddenBlockIdSet = useMemo(() => new Set(options.hiddenBlockIds), [options.hiddenBlockIds]);

  const toggleBlock = useCallback(
    (id: string, hidden: boolean) => {
      const next = new Set(hiddenBlockIdSet);
      if (hidden) next.add(id);
      else next.delete(id);
      onChange({ ...options, hiddenBlockIds: Array.from(next) });
    },
    [hiddenBlockIdSet, options, onChange],
  );

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto border-r bg-background p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">レイアウト調整</h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1 text-xs">
          <RotateCcw className="size-3.5" />
          初期化
        </Button>
      </div>

      <Section title="用紙">
        <Field label="サイズ">
          <Select
            value={options.paperSize}
            onValueChange={(value) => update('paperSize', value as PdfPaperSize)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PDF_PAPER_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col items-start">
                    <span>{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="向き">
          <ToggleGroup
            type="single"
            value={options.orientation}
            onValueChange={(v) => v && update('orientation', v as PdfOrientation)}
            className="w-full"
            variant="outline"
          >
            {PDF_ORIENTATION_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </Section>

      <Separator />

      <Section title="文字とサイズ">
        <Field label={`フォントサイズ (${options.baseFontSize.toFixed(1)}pt)`}>
          <Slider
            min={6}
            max={14}
            step={0.5}
            value={[options.baseFontSize]}
            onValueChange={([v]) => update('baseFontSize', v)}
          />
        </Field>
        <Field label={`余白 (${options.marginMm.toFixed(0)}mm)`}>
          <Slider
            min={4}
            max={25}
            step={1}
            value={[options.marginMm]}
            onValueChange={([v]) => update('marginMm', v)}
          />
        </Field>
        <Field label="間隔">
          <ToggleGroup
            type="single"
            value={options.density}
            onValueChange={(v) => v && update('density', v as PdfDensity)}
            className="w-full"
            variant="outline"
          >
            {PDF_DENSITY_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1 text-xs">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={options.autoFitOnePage}
            onCheckedChange={(checked) => update('autoFitOnePage', checked !== false)}
          />
          1ページに収まるよう自動でフォント縮小
        </label>
      </Section>

      <Separator />

      <Section title="ヘッダーに表示する情報">
        <div className="grid gap-1">
          {PDF_HEADER_FIELD_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                checked={options.header[opt.key]}
                onCheckedChange={(checked) => updateHeader(opt.key, checked !== false)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="その他">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={options.includeItunesLinks}
            onCheckedChange={(checked) => update('includeItunesLinks', checked !== false)}
          />
          iTunes 曲情報セクションを含める
        </label>
      </Section>

      <Separator />

      <Section title="表示するブロック">
        {config ? (
          <BlockVisibilityList
            config={config}
            hiddenBlockIds={hiddenBlockIdSet}
            onToggle={toggleBlock}
          />
        ) : (
          <p className="text-xs text-muted-foreground">フォーム情報を読み込み中...</p>
        )}
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
