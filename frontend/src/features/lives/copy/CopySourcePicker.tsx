/** 取り込み元のライブを選ぶ一覧。所属テナントごとにまとめて表示する。 */
import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { formatLiveDate, LIVE_STATUS_LABELS, type LiveCopySourceResponse } from '../types/live-types';

interface CopySourcePickerProps {
  sources: LiveCopySourceResponse[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (source: LiveCopySourceResponse) => void;
  /** 取り込める中身を持っているか。false のライブは選べない。 */
  isAvailable: (source: LiveCopySourceResponse) => boolean;
  unavailableLabel: string;
}

export const CopySourcePicker = ({
  sources,
  isLoading,
  selectedId,
  onSelect,
  isAvailable,
  unavailableLabel,
}: CopySourcePickerProps) => {
  const [keyword, setKeyword] = useState('');

  const grouped = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const matched = normalized
      ? sources.filter((source) =>
          source.name.toLowerCase().includes(normalized) || source.tenantName.toLowerCase().includes(normalized))
      : sources;

    const byTenant = new Map<string, { tenantName: string; lives: LiveCopySourceResponse[] }>();
    for (const source of matched) {
      const entry = byTenant.get(source.tenantId) ?? { tenantName: source.tenantName, lives: [] };
      entry.lives.push(source);
      byTenant.set(source.tenantId, entry);
    }
    return Array.from(byTenant.values());
  }, [keyword, sources]);

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">ライブ一覧を読み込み中です...</p>;
  }

  if (sources.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">取り込み元にできる他のライブがありません。</p>;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="ライブ名・サークル名で絞り込む"
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[320px] rounded-md border">
        <div className="space-y-4 p-3">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">条件に合うライブがありません。</p>
          ) : null}
          {grouped.map((group) => (
            <div key={group.tenantName} className="space-y-1.5">
              <p className="px-1 text-xs font-medium text-muted-foreground">{group.tenantName}</p>
              {group.lives.map((source) => {
                const available = isAvailable(source);
                const isSelected = selectedId === source.id;
                return (
                  <button
                    key={source.id}
                    type="button"
                    disabled={!available}
                    onClick={() => onSelect(source)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                      !available && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{source.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatLiveDate(source.date)} / {LIVE_STATUS_LABELS[source.status]}
                        {available ? '' : ` / ${unavailableLabel}`}
                      </p>
                    </div>
                    {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    {!available ? <Badge variant="secondary" className="shrink-0">なし</Badge> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
