/** 出演者が配置図を入力する欄。アイコンを選んで置き、ドラッグで動かし、ラベルを書き換える。 */
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useStagePlotSettings } from './StagePlotContext';
import { StagePlotCanvas } from './StagePlotCanvas';
import { SvgIconNodes } from './SvgIconNodes';
import {
  MAX_PLOT_ITEMS,
  MAX_PLOT_LABEL_LENGTH,
  parseStagePlotValue,
  serializeStagePlotValue,
  type PaletteItem,
  type PlotItem,
} from './stage-plot-types';

interface Props {
  inputId: string;
  value: string;
  onChange: (next: string) => void;
}

export function StagePlotInput({ inputId, value, onChange }: Props) {
  const { settings, baseUrl } = useStagePlotSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { items } = parseStagePlotValue(value);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (!settings || settings.palette.length === 0) {
    return null;
  }

  const commit = (next: PlotItem[]) => onChange(serializeStagePlotValue({ items: next }));

  const addItem = (palette: PaletteItem) => {
    if (items.length >= MAX_PLOT_ITEMS) return;
    // 同じ場所に重ならないよう、置くたびに少しずらす
    const offset = (items.length % 5) * 0.05;
    const item: PlotItem = { id: crypto.randomUUID(), paletteId: palette.id, label: palette.label, x: 0.4 + offset, y: 0.5 };
    commit([...items, item]);
    setSelectedId(item.id);
  };

  const updateItem = (id: string, patch: Partial<PlotItem>) => {
    commit(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    commit(items.filter((item) => item.id !== id));
    setSelectedId(null);
  };

  return (
    <div id={inputId} className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {settings.palette.map((palette) => (
          <Button
            key={palette.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem(palette)}
            disabled={items.length >= MAX_PLOT_ITEMS}
            className="gap-1.5"
          >
            <SvgIconNodes nodes={palette.nodes} color={palette.color || '#111827'} size={18} />
            {palette.label}
          </Button>
        ))}
      </div>
      <StagePlotCanvas
        palette={settings.palette}
        iconScale={settings.iconScale}
        aspectRatio={settings.aspectRatio}
        baseUrl={baseUrl}
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={(id, x, y) => updateItem(id, { x, y })}
      />
      {selected && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
          <span className="shrink-0 text-xs text-muted-foreground">名前</span>
          <Input
            value={selected.label}
            maxLength={MAX_PLOT_LABEL_LENGTH}
            onChange={(event) => updateItem(selected.id, { label: event.target.value })}
            aria-label="選んだアイコンの名前"
            className="h-9 flex-1 text-base sm:text-sm"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(selected.id)} aria-label="このアイコンを消す">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
