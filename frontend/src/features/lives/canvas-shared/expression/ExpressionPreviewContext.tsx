/** Context that provides expression preview capability to expression inputs
 *  deep in the tree. Populated by PdfPreviewPage when liveId and submissionId
 *  are known. */
import { createContext, useCallback, useContext } from 'react';

import { apiClient } from '@/lib/api/client';

/** 繰り返し行・フィールド行の書式は `item` / `value` が束縛されて評価されるため、
 *  プレビューでも同じ条件を再現できるよう見本行を指定できるようにする。 */
export interface ExpressionRowScope {
  groupId?: string;
  fieldId?: string;
}

export interface ExpressionPreviewResult {
  result: string;
  isError: boolean;
}

/** 全提出に対して同じ式を評価した 1 件分の結果。 */
export interface ExpressionPreviewRow {
  submissionId: string;
  recordLabel: string;
  result: string;
  error: boolean;
}

interface ExpressionPreviewCtx {
  liveId: string | undefined;
  submissionId: string | undefined;
  /** プレビューに使っている提出の表示名。どのデータで試しているか示すために使う。 */
  submissionLabel: string | undefined;
  /** Evaluates an expression against the live+submission context on the backend. */
  previewExpression: ((expr: string, scope?: ExpressionRowScope) => Promise<ExpressionPreviewResult>) | undefined;
  /** 同じ式をライブの全提出に対して評価する。一部の提出だけ壊れていないか確認するのに使う。 */
  previewExpressionForAll: ((expr: string, scope?: ExpressionRowScope) => Promise<ExpressionPreviewRow[]>) | undefined;
}

const ExpressionPreviewContext = createContext<ExpressionPreviewCtx>({
  liveId: undefined,
  submissionId: undefined,
  submissionLabel: undefined,
  previewExpression: undefined,
  previewExpressionForAll: undefined,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useExpressionPreview() {
  return useContext(ExpressionPreviewContext);
}

interface ProviderProps {
  liveId: string | undefined;
  submissionId: string | undefined;
  submissionLabel?: string;
  children: React.ReactNode;
}

export function ExpressionPreviewProvider({ liveId, submissionId, submissionLabel, children }: ProviderProps) {
  const previewExpression = useCallback(
    async (expr: string, scope?: ExpressionRowScope): Promise<ExpressionPreviewResult> => {
      if (!liveId || !submissionId) {
        return { result: 'プレビューするには提出データが必要です', isError: true };
      }
      try {
        const res = await apiClient.post<{ result: string; error?: string }>(
          `/lives/${liveId}/setting-sheet/submissions/${submissionId}/preview-expression`,
          { expression: expr, groupId: scope?.groupId ?? '', fieldId: scope?.fieldId ?? '' },
        );
        return { result: res?.result ?? '', isError: Boolean(res?.error) };
      } catch {
        return { result: 'プレビューを取得できませんでした', isError: true };
      }
    },
    [liveId, submissionId],
  );

  const previewExpressionForAll = useCallback(
    async (expr: string, scope?: ExpressionRowScope): Promise<ExpressionPreviewRow[]> => {
      if (!liveId) {
        return [];
      }
      const rows = await apiClient.post<ExpressionPreviewRow[]>(
        `/lives/${liveId}/setting-sheet/preview-expression`,
        { expression: expr, groupId: scope?.groupId ?? '', fieldId: scope?.fieldId ?? '' },
      );
      return rows ?? [];
    },
    [liveId],
  );

  return (
    <ExpressionPreviewContext.Provider
      value={{ liveId, submissionId, submissionLabel, previewExpression, previewExpressionForAll }}
    >
      {children}
    </ExpressionPreviewContext.Provider>
  );
}
