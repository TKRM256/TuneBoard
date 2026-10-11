/** lucide のアイコンから 1 つ選ぶダイアログ。選んだアイコンの図形データ（nodes）も一緒に返す。
 *  アイコンは数が多いので、表示する分だけ読み込む。 */
import { useMemo, useState } from 'react';
import { DynamicIcon, dynamicIconImports, iconNames, type IconName } from 'lucide-react/dynamic';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { INSTRUMENT_ICONS } from './instrument-icons';
import { SvgIconNodes } from './SvgIconNodes';
import type { IconNode } from './stage-plot-types';

const MAX_RESULTS = 120;

/** よく使いそうなアイコン。検索語が空のときに先頭に出す。 */
const SUGGESTED: IconName[] = [
  'check', 'square-check', 'circle', 'circle-check', 'x', 'guitar', 'mic', 'mic-vocal', 'drum', 'piano',
  'keyboard-music', 'speaker', 'volume-2', 'music', 'user', 'users', 'arrow-right', 'arrow-down', 'star', 'monitor',
];

export interface PickedIcon {
  iconName: string;
  nodes: IconNode[];
  /** 楽器アイコンのように日本語の名前があるもの */
  label?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (icon: PickedIcon) => void;
}

export function IconPicker({ open, onOpenChange, onSelect }: Props) {
  const [keyword, setKeyword] = useState('');
  const [loadingName, setLoadingName] = useState<string | null>(null);

  const instruments = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return INSTRUMENT_ICONS;
    return INSTRUMENT_ICONS.filter((icon) => `${icon.label} ${icon.keywords}`.toLowerCase().includes(normalized));
  }, [keyword]);

  const results = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return [...SUGGESTED, ...iconNames.filter((name) => !SUGGESTED.includes(name))].slice(0, MAX_RESULTS);
    return iconNames.filter((name) => name.includes(normalized)).slice(0, MAX_RESULTS);
  }, [keyword]);

  const handlePick = async (name: IconName) => {
    setLoadingName(name);
    try {
      const module = await dynamicIconImports[name]();
      onSelect({ iconName: name, nodes: module.__iconNode.map(([tag, attrs]) => [tag, toStringAttrs(attrs)]) });
      onOpenChange(false);
    } catch {
      toast.error('アイコンを読み込めませんでした', { position: 'top-center' });
    } finally {
      setLoadingName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>アイコンを選ぶ</DialogTitle>
          <DialogDescription className="sr-only">アイコンを選ぶ</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="アイコン名で検索" className="pl-9" autoFocus />
        </div>
        <div className="grid max-h-[55dvh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
          {instruments.map((icon) => (
            <Button
              key={icon.name}
              type="button"
              variant="outline"
              className="flex h-auto flex-col gap-1 px-1 py-2"
              onClick={() => {
                onSelect({ iconName: icon.name, nodes: icon.nodes, label: icon.label });
                onOpenChange(false);
              }}
              disabled={loadingName !== null}
              title={icon.label}
            >
              <SvgIconNodes nodes={icon.nodes} size={24} />
              <span className="w-full truncate text-[10px] font-normal text-muted-foreground">{icon.label}</span>
            </Button>
          ))}
          {results.map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              className="flex h-auto flex-col gap-1 px-1 py-2"
              onClick={() => void handlePick(name)}
              disabled={loadingName !== null}
              title={name}
            >
              {loadingName === name ? <Loader2 className="size-6 animate-spin" /> : <DynamicIcon name={name} className="size-6" />}
              <span className="w-full truncate text-[10px] font-normal text-muted-foreground">{name}</span>
            </Button>
          ))}
          {results.length === 0 && instruments.length === 0 ? <p className="col-span-full py-6 text-center text-sm text-muted-foreground">見つかりませんでした</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toStringAttrs(attrs: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'key' && value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}
