/** エディタ上で、見本の提出を使った実際の値を見せる。位置合わせをしやすくするため。 */
import type { ReactNode } from 'react';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { humanizeExpression } from '../canvas-shared/expression/expression-labels';
import { useExpressionPreviewValue } from '../canvas-shared/expression/useExpressionPreviewValue';

/** 式の評価結果。まだ無いときや失敗したときは、ID をラベルに直した式を出す。 */
export function LiveText({ template, catalog }: { template: string; catalog: FieldCatalog }) {
  const { result, isError, isAvailable } = useExpressionPreviewValue(template);
  if (!template.includes('${')) return <>{template}</>;
  if (isAvailable && !isError && result !== '') return <>{result}</>;
  return <span className="opacity-60">{humanizeExpression(template, catalog)}</span>;
}

/** 表示条件が見本の提出で偽なら薄く出す（出力では描かれない）。 */
export function ConditionDim({ condition, children }: { condition: string | undefined; children: ReactNode }) {
  const expression = toTemplate(condition);
  const { result, isError, isAvailable } = useExpressionPreviewValue(expression);
  const hidden = Boolean(expression) && isAvailable && !isError && !isTruthy(result);
  const broken = Boolean(expression) && isAvailable && isError;
  return (
    <div
      className="size-full"
      title={broken ? `表示条件のエラー: ${result}` : undefined}
      style={{ opacity: hidden ? 0.25 : 1, outline: broken ? '1.5px solid #dc2626' : undefined }}
    >
      {children}
    </div>
  );
}

function toTemplate(condition: string | undefined): string {
  const trimmed = condition?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.startsWith('${') ? trimmed : `\${${trimmed}}`;
}

/** バックエンドの ConditionEvaluator.truthy と同じ判定（文字にした結果で判定する） */
function isTruthy(result: string): boolean {
  const value = result.trim();
  return value !== '' && value.toLowerCase() !== 'false' && value !== '0' && value !== '[]';
}
