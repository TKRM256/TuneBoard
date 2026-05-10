/** Context that provides expression preview capability to expression inputs
 *  deep in the tree. Populated by PdfPreviewPage when liveId and submissionId
 *  are known. */
import { createContext, useCallback, useContext } from 'react';

import { apiClient } from '@/lib/api/client';

interface ExpressionPreviewCtx {
  liveId: string | undefined;
  submissionId: string | undefined;
  /** Evaluates an expression against the live+submission context on the backend.
   *  Returns the result string, or an error message prefixed with "[". */
  previewExpression: ((expr: string) => Promise<string>) | undefined;
}

const ExpressionPreviewContext = createContext<ExpressionPreviewCtx>({
  liveId: undefined,
  submissionId: undefined,
  previewExpression: undefined,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useExpressionPreview() {
  return useContext(ExpressionPreviewContext);
}

interface ProviderProps {
  liveId: string | undefined;
  submissionId: string | undefined;
  children: React.ReactNode;
}

export function ExpressionPreviewProvider({ liveId, submissionId, children }: ProviderProps) {
  const previewExpression = useCallback(
    async (expr: string): Promise<string> => {
      if (!liveId || !submissionId) return '(プレビュー不可: ライブ/提出未選択)';
      try {
        const res = await apiClient.post<{ result: string; error?: string }>(
          `/lives/${liveId}/setting-sheet/submissions/${submissionId}/preview-expression`,
          { expression: expr },
        );
        return res?.result ?? '';
      } catch {
        return '[プレビューエラー]';
      }
    },
    [liveId, submissionId],
  );

  return (
    <ExpressionPreviewContext.Provider value={{ liveId, submissionId, previewExpression }}>
      {children}
    </ExpressionPreviewContext.Provider>
  );
}
