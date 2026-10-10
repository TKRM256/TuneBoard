/** Search / sort state for the submissions table. */
import { useCallback, useMemo, useState } from 'react';

import type { PublicSettingSheetSubmissionDetailResponse } from '../types/live-types';
import { extractCellValue, type ColumnDef } from '../helpers/submission-table-helpers';
import { compareCellValues, type SortDirection } from '../helpers/submission-search-helpers';

/** 検索対象カラムの「すべての項目」を表す値。 */
export const ALL_COLUMNS_VALUE = 'ALL';

export interface SubmissionSort {
  columnId: string;
  direction: SortDirection;
}

export function useSubmissionTableView(
  details: PublicSettingSheetSubmissionDetailResponse[],
  tableColumns: ColumnDef[],
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumnId, setSearchColumnId] = useState<string>(ALL_COLUMNS_VALUE);
  const [sort, setSort] = useState<SubmissionSort | null>(null);

  // フォーム設定の変更で対象カラムが消えた場合は「すべての項目」として扱う
  const searchColumn = useMemo(
    () => tableColumns.find((column) => column.id === searchColumnId) ?? null,
    [tableColumns, searchColumnId],
  );
  const searchColumns = useMemo(
    () => (searchColumn ? [searchColumn] : tableColumns),
    [searchColumn, tableColumns],
  );

  const visibleDetails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? details.filter((detail) => searchColumns.some((column) => (
        extractCellValue(detail.answers, column.path, column.type).toLowerCase().includes(query)
      )))
      : details;

    const sortColumn = sort ? tableColumns.find((column) => column.id === sort.columnId) : null;
    if (!sort || !sortColumn) {
      return filtered;
    }

    return [...filtered].sort((a, b) => compareCellValues(
      extractCellValue(a.answers, sortColumn.path, sortColumn.type),
      extractCellValue(b.answers, sortColumn.path, sortColumn.type),
      sort.direction,
    ));
  }, [details, searchColumns, searchQuery, sort, tableColumns]);

  /** 昇順 -> 降順 -> 解除 の順に切り替える。 */
  const toggleSort = useCallback((columnId: string) => {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      return prev.direction === 'asc' ? { columnId, direction: 'desc' } : null;
    });
  }, []);

  /** 検索対象に含まれるカラムだけをハイライトする。 */
  const isHighlightColumn = useCallback(
    (columnId: string) => !searchColumn || searchColumn.id === columnId,
    [searchColumn],
  );

  return {
    searchQuery,
    setSearchQuery,
    // 消えたカラムがselectに残らないよう、実際に使われている値を返す
    searchColumnId: searchColumn ? searchColumn.id : ALL_COLUMNS_VALUE,
    setSearchColumnId,
    searchColumn,
    sort,
    toggleSort,
    visibleDetails,
    isHighlightColumn,
  };
}
