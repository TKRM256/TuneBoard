/** 変数・ヘルパーの一覧。ポップオーバー版と拡大編集モーダルの常設パネルで共用する。 */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import type { FieldCatalog } from '../field-catalog';
import { splitExpressionLabels } from './expression-labels';
import { buildSnippetGroups, type SnippetEntry } from './expression-snippets';

interface Props {
  catalog: FieldCatalog;
  /** `${...}` で包んだ状態のスニペットを渡す。 */
  onInsert: (snippet: string) => void;
  className?: string;
}

export function ExpressionSnippetList({ catalog, onInsert, className }: Props) {
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
  };

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ''}`}>
      <div className="border-b p-2">
        <div className="flex items-center gap-2 rounded-md border bg-background px-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            placeholder="変数・ヘルパーを検索 (例: 氏名, join, formatDate)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-7 border-0 px-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                  key={entry.expression + entry.label}
                  type="button"
                  onClick={() => handleInsert(entry)}
                  className="w-full rounded px-2 py-1 text-left transition-colors hover:bg-muted"
                >
                  <div className="text-xs font-medium">{entry.label}</div>
                  <div
                    className="truncate font-mono text-[10px] text-muted-foreground"
                    title={`\${${entry.expression}}`}
                  >
                    {'${'}
                    {splitExpressionLabels(entry.expression, catalog).map((segment, index) => (
                      segment.isLabel
                        ? (
                          <span key={index} className="rounded bg-primary/15 px-1 text-primary">
                            {segment.text}
                          </span>
                        )
                        : <span key={index}>{segment.text}</span>
                    ))}
                    {'}'}
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
      </div>
    </div>
  );
}
