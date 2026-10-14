/** 提出確認の一覧。検索と、検索する項目の切り替えと、表。 */
import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';

import { TrashButton } from '@/components/original/TrashSheet';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { ColumnDef } from '../helpers/submission-table-helpers';
import { ALL_COLUMNS_VALUE } from '../hooks/use-submission-table-view';
import { SubmissionsTable } from './SubmissionsTable';

interface Props {
  columns: ColumnDef[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchColumnId: string;
  onSearchColumnChange: (value: string) => void;
  /** 管理者だけ。ゴミ箱を開く */
  onOpenTrash?: () => void;
  trashCount: number;
  table: Omit<ComponentProps<typeof SubmissionsTable>, 'columns' | 'searchQuery'>;
}

export function SubmissionsListCard({ columns, searchQuery, onSearchQueryChange, searchColumnId, onSearchColumnChange, onOpenTrash, trashCount, table }: Props) {
  const hasColumns = columns.length > 0;
  return (
    <Card className="gap-4 px-3 py-4 sm:px-4" data-tour="submissions-list">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="pl-8"
            aria-label="提出を検索"
            placeholder="検索してみましょう"
            disabled={!hasColumns}
          />
        </div>
        <Select value={searchColumnId} onValueChange={onSearchColumnChange} disabled={!hasColumns}>
          <SelectTrigger className="w-full sm:w-56" aria-label="検索対象の項目">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_COLUMNS_VALUE}>すべての項目</SelectItem>
            {columns.map((column) => (
              <SelectItem key={column.id} value={column.id}>{column.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between gap-2 sm:ml-auto">
          <span className="text-sm text-muted-foreground">{table.details.length}件</span>
          {onOpenTrash ? <span data-tour="submissions-trash"><TrashButton onClick={onOpenTrash} count={trashCount} /></span> : null}
        </div>
      </div>
      {!hasColumns ? (
        <p className="py-6 text-center text-sm text-muted-foreground">表示設定で「管理者用」にした項目が、ここに並びます</p>
      ) : table.details.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">該当する提出はありません</p>
      ) : (
        <SubmissionsTable columns={columns} searchQuery={searchQuery} {...table} />
      )}
    </Card>
  );
}
