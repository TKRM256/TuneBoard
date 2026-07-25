/** 式の中に出てくる項目 ID を、フォームの項目ラベルに置き換えて読めるようにする。
 *  ID は保存する式の実体としては残し、表示だけを差し替える。 */
import type { FieldCatalog } from '../field-catalog';

/**
 * 式の中で項目 ID が現れる箇所。
 * - `fields['id']` / `groups['id']`
 * - `.field('id')` / `.group('id')`
 * - `joinField(x, 'id', ...)` などの第 2 引数に来る裸の ID 文字列
 *
 * ID はユーザーが自分で追加した項目だと UUID になるため、
 * UUID に限らずカタログに載っている ID はすべてラベル表示の対象にする。
 */
const ID_IN_EXPRESSION = /(fields|groups)\['([^']+)'\]|\.(field|group)\('([^']+)'\)|'([^']+)'/g;

export interface ExpressionLabelSegment {
  text: string;
  /** カタログ上のラベルに置き換えた表示か */
  isLabel: boolean;
}

/**
 * 式を「そのままの文字列」と「ラベルに置き換えた部分」の並びに分解する。
 * UI 側でラベル部分だけチップとして装飾できるようにするためセグメントで返す。
 */
export function splitExpressionLabels(expression: string, catalog: FieldCatalog): ExpressionLabelSegment[] {
  const segments: ExpressionLabelSegment[] = [];
  let cursor = 0;

  for (const match of expression.matchAll(ID_IN_EXPRESSION)) {
    const start = match.index ?? 0;
    const id = match[2] ?? match[4] ?? match[5];
    const info = id ? catalog.labelById.get(id) : undefined;
    if (!info) {
      continue;
    }

    // ID の前後（`fields['` や `'` など）はそのまま残し、ID 部分だけを差し替える
    const idStart = expression.indexOf(id, start);
    if (idStart < 0) {
      continue;
    }

    if (idStart > cursor) {
      segments.push({ text: expression.slice(cursor, idStart), isLabel: false });
    }
    segments.push({ text: info.label, isLabel: true });
    cursor = idStart + id.length;
  }

  if (cursor < expression.length) {
    segments.push({ text: expression.slice(cursor), isLabel: false });
  }

  return segments;
}

/** ID をラベルに置き換えた 1 本の文字列にする。検索やツールチップ向け。 */
export function humanizeExpression(expression: string, catalog: FieldCatalog): string {
  return splitExpressionLabels(expression, catalog)
    .map((segment) => segment.text)
    .join('');
}
