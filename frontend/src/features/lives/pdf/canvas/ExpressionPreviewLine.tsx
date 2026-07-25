/** 式の評価結果を、実際の提出データを使ってその場に表示する。 */
import { CornerDownRight, Loader2 } from 'lucide-react';

import type { ExpressionRowScope } from './ExpressionPreviewContext';
import { useExpressionPreviewValue } from './useExpressionPreviewValue';

interface Props {
  expression: string;
  scope?: ExpressionRowScope;
  /** 結果を折り返して全文出すか（拡大編集用）。既定は 1 行に省略。 */
  expanded?: boolean;
}

export function ExpressionPreviewLine({ expression, scope, expanded = false }: Props) {
  const { result, isError, isLoading, isAvailable, submissionLabel } = useExpressionPreviewValue(expression, scope);

  if (!expression.includes('${')) {
    return null;
  }

  if (!isAvailable) {
    return (
      <p className="px-0.5 text-[10px] text-muted-foreground">
        提出を選ぶと、ここに実際の値が表示されます
      </p>
    );
  }

  return (
    <div className={`flex gap-1 px-0.5 text-[10px] ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
      {isLoading
        ? <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin" />
        : <CornerDownRight className="mt-0.5 size-3 shrink-0" />}
      <span className="min-w-0 flex-1">
        <span
          className={`font-mono ${expanded ? 'whitespace-pre-wrap wrap-break-word' : 'block truncate'}`}
          title={result}
        >
          {result || '(空)'}
        </span>
        {expanded && submissionLabel ? (
          <span className="mt-1 block text-muted-foreground/80">{submissionLabel} の値で評価</span>
        ) : null}
      </span>
    </div>
  );
}
