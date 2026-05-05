/** Popover that lets the user insert `${...}` snippets into a text-like input
 *  by clicking categorized variables / helpers. */
import { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FieldCatalog } from '../field-catalog';
import { buildSnippetGroups, type SnippetEntry } from './expression-snippets';

interface Props {
  catalog: FieldCatalog;
  onInsert: (snippet: string) => void;
  buttonLabel?: string;
  size?: 'sm' | 'icon';
}

export function ExpressionSnippetPicker({ catalog, onInsert, buttonLabel = '式を挿入', size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => buildSnippetGroups(catalog), [catalog]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const needle = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) =>
          (e.label + ' ' + (e.hint ?? '') + ' ' + e.expression + ' ' + (e.keywords ?? ''))
            .toLowerCase()
            .includes(needle),
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [groups, query]);

  const handleInsert = (entry: SnippetEntry) => {
    onInsert(`\${${entry.expression}}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {size === 'icon' ? (
          <Button variant="ghost" size="icon" className="size-7" aria-label={buttonLabel}>
            <Sparkles className="size-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Sparkles className="size-3.5" />
            {buttonLabel}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-2">
          <div className="flex items-center gap-2 rounded-md border bg-background px-2">
            <Search className="size-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="変数・ヘルパーを検索 (例: 氏名, join, formatDate)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-7 border-0 px-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="space-y-3 p-2">
            {filteredGroups.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                該当するスニペットがありません。
              </p>
            )}
            {filteredGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </div>
                {group.entries.map((entry) => (
                  <button
                    type="button"
                    key={entry.expression + entry.label}
                    onClick={() => handleInsert(entry)}
                    className="block w-full rounded px-2 py-1 text-left transition-colors hover:bg-muted"
                  >
                    <div className="text-xs font-medium">{entry.label}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {`\${${entry.expression}}`}
                    </div>
                    {entry.hint && (
                      <div className="truncate text-[10px] text-muted-foreground/80">
                        {entry.hint}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
