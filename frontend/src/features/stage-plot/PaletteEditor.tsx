/** 出演者が配置図に置けるアイコンの一覧を編集する。 */
import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { IconPicker, type PickedIcon } from './IconPicker';
import { SvgIconNodes } from './SvgIconNodes';
import type { PaletteItem } from './stage-plot-types';

const MAX_PALETTE = 40;
const MAX_LABEL = 30;

interface Props {
  palette: PaletteItem[];
  onChange: (palette: PaletteItem[]) => void;
}

export function PaletteEditor({ palette, onChange }: Props) {
  /** 'new' なら追加、ID ならそのアイコンを差し替え */
  const [picking, setPicking] = useState<string | null>(null);

  const update = (id: string, patch: Partial<PaletteItem>) =>
    onChange(palette.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const move = (index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= palette.length) return;
    const next = [...palette];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  const handlePick = (icon: PickedIcon) => {
    if (picking === 'new') {
      onChange([...palette, { id: crypto.randomUUID(), iconName: icon.iconName, label: (icon.label ?? icon.iconName).slice(0, MAX_LABEL), color: '#111827', nodes: icon.nodes }]);
    } else if (picking) {
      update(picking, { iconName: icon.iconName, nodes: icon.nodes });
    }
  };

  return (
    <div className="space-y-2">
      {palette.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded border hover:bg-muted"
            onClick={() => setPicking(item.id)}
            title="アイコンを変える"
          >
            <SvgIconNodes nodes={item.nodes} color={item.color} size={28} />
          </button>
          <Input
            value={item.label}
            maxLength={MAX_LABEL}
            onChange={(event) => update(item.id, { label: event.target.value })}
            aria-label="アイコンの名前"
            className="h-9 min-w-0 flex-1"
          />
          <input
            type="color"
            value={item.color || '#111827'}
            onChange={(event) => update(item.id, { color: event.target.value })}
            className="h-9 w-10 cursor-pointer rounded border"
            aria-label="アイコンの色"
          />
          <Button variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label="上へ">
            <ArrowUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={index === palette.length - 1} onClick={() => move(index, 1)} aria-label="下へ">
            <ArrowDown className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onChange(palette.filter((p) => p.id !== item.id))} aria-label="消す">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setPicking('new')} disabled={palette.length >= MAX_PALETTE}>
        <Plus className="size-4" />アイコンを追加
      </Button>
      <IconPicker open={picking !== null} onOpenChange={(open) => { if (!open) setPicking(null); }} onSelect={handlePick} />
    </div>
  );
}
