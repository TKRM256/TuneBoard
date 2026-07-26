/** 取り込む項目をチェックで選ばせる共通リスト。3つの取り込み機能で共有する。 */
import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface CopyChecklistItem {
  key: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  /** 一緒に取り込まれる中身などの補足。 */
  detail?: string;
  /** 現在の内容から取り込み後の内容への変化。 */
  diff?: { before: string; after: string };
  selectable: boolean;
  /** 選べない理由。 */
  note?: string;
}

interface CopyChecklistProps {
  items: CopyChecklistItem[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  emptyMessage: string;
  className?: string;
}

export const CopyChecklist = ({ items, selected, onToggle, emptyMessage, className }: CopyChecklistProps) => {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ScrollArea className={cn('rounded-md border', className)}>
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.key} className={cn('p-3', !item.selectable && 'opacity-60')}>
            <label className={cn('flex gap-3', item.selectable ? 'cursor-pointer' : 'cursor-not-allowed')}>
              <Checkbox
                className="mt-0.5 shrink-0"
                checked={selected.has(item.key)}
                disabled={!item.selectable}
                onCheckedChange={() => onToggle(item.key)}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium wrap-break-word">{item.title}</span>
                  {item.badge ? (
                    <Badge variant={item.badge.variant ?? 'secondary'} className="shrink-0">{item.badge.label}</Badge>
                  ) : null}
                </div>
                {item.subtitle ? <p className="text-xs text-muted-foreground wrap-break-word">{item.subtitle}</p> : null}
                {item.diff ? (
                  <p className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground line-clamp-2 wrap-break-word">{item.diff.before || '(未入力)'}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium line-clamp-2 wrap-break-word">{item.diff.after || '(未入力)'}</span>
                  </p>
                ) : null}
                {item.detail ? <p className="text-xs text-muted-foreground wrap-break-word">{item.detail}</p> : null}
                {item.note ? <p className="text-xs text-destructive wrap-break-word">{item.note}</p> : null}
              </div>
            </label>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};
