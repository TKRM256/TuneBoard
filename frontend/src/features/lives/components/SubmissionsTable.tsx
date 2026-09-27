/** Submissions table with sortable headers and keyword highlighting. */
import { ArrowDown, ArrowUp, ChevronsUpDown, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { PublicSettingSheetSubmissionDetailResponse } from '../types/live-types';
import { extractCellValue, type ColumnDef } from '../helpers/submission-table-helpers';
import { highlightKeyword } from '../helpers/submission-search-helpers';
import type { SubmissionSort } from '../hooks/use-submission-table-view';

interface SubmissionsTableProps {
  columns: ColumnDef[];
  details: PublicSettingSheetSubmissionDetailResponse[];
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  duplicateMap: Map<string, string[]>;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  isDeleting: (id: string) => boolean;
  sort: SubmissionSort | null;
  onToggleSort: (columnId: string) => void;
  searchQuery: string;
  isHighlightColumn: (columnId: string) => boolean;
}

const getAriaSort = (sort: SubmissionSort | null, columnId: string) => {
  if (!sort || sort.columnId !== columnId) {
    return 'none' as const;
  }
  return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
};

const SortIcon = ({ sort, columnId }: { sort: SubmissionSort | null; columnId: string }) => {
  if (!sort || sort.columnId !== columnId) {
    return <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/50" />;
  }
  return sort.direction === 'asc'
    ? <ArrowUp className="size-3.5 shrink-0" />
    : <ArrowDown className="size-3.5 shrink-0" />;
};

export const SubmissionsTable = ({
  columns,
  details,
  selectedIds,
  allSelected,
  onToggleSelectAll,
  onToggleSelect,
  onRowClick,
  duplicateMap,
  isAdmin,
  onDelete,
  isDeleting,
  sort,
  onToggleSort,
  searchQuery,
  isHighlightColumn,
}: SubmissionsTableProps) => {
  const keyword = searchQuery.trim();

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-background">
          <TableRow>
            <TableHead className="bg-background w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => onToggleSelectAll()}
                aria-label="表示中の全提出を選択"
              />
            </TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className="min-w-[150px] whitespace-normal bg-background"
                aria-sort={getAriaSort(sort, column.id)}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-1 text-left hover:text-foreground/70"
                  onClick={() => onToggleSort(column.id)}
                  title={`${column.label}で並び替え`}
                >
                  <span className="whitespace-normal">{column.label}</span>
                  <SortIcon sort={sort} columnId={column.id} />
                </button>
              </TableHead>
            ))}
            {duplicateMap.size > 0 && (
              <TableHead className="whitespace-nowrap bg-background text-center">曲かぶり</TableHead>
            )}
            {isAdmin && <TableHead className="bg-background w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {details.map((detail) => (
            <TableRow
              key={detail.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(detail.id)}
            >
              <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(detail.id)}
                  onCheckedChange={() => onToggleSelect(detail.id)}
                  aria-label="この提出を選択"
                />
              </TableCell>
              {columns.map((column) => {
                const value = extractCellValue(detail.answers, column.path, column.type);
                return (
                  <TableCell key={`${detail.id}-${column.id}`} className="min-w-[150px] whitespace-pre-line align-top text-sm">
                    {isHighlightColumn(column.id) ? highlightKeyword(value, keyword) : value}
                  </TableCell>
                );
              })}
              {duplicateMap.size > 0 && (
                <TableCell className="whitespace-nowrap text-center align-top">
                  {duplicateMap.has(detail.id) && (
                    <Badge variant="destructive" className="text-xs">
                      {duplicateMap.get(detail.id)!.length}曲
                    </Badge>
                  )}
                </TableCell>
              )}
              {isAdmin && (
                <TableCell className="align-top">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => { e.stopPropagation(); onDelete(detail.id); }}
                    disabled={isDeleting(detail.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
