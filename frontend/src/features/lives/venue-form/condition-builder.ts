/** 表示条件の作成補助。項目と比べ方を選ぶと、JEXL の式（`${...}`）を組み立てる。 */

export type ConditionOperator = 'includes' | 'equals' | 'filled' | 'isTrue' | 'isFalse';

export interface ConditionSpec {
  fieldId: string;
  /** グループの中の項目なら、そのグループ。itemIndex が無ければ「いずれかの件で」満たせば真になる */
  groupId?: string | null;
  /** グループの何件目（1 始まり）で判定するか。その件が無ければ偽 */
  itemIndex?: number | null;
  operator: ConditionOperator;
  value?: string;
}

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  includes: 'に次の選択肢が含まれる',
  equals: 'が次と等しい',
  filled: 'が入力されている',
  isTrue: 'がオン（はい）',
  isFalse: 'がオフ（いいえ）',
};

/** JEXL の文字列リテラルにする（' と \ を逃がす）。 */
export function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function predicate(target: string, valuesTarget: string, spec: ConditionSpec): string {
  const value = quote(spec.value ?? '');
  switch (spec.operator) {
    case 'includes':
      return `contains(${valuesTarget}, ${value})`;
    case 'equals':
      return `${target}.value == ${value}`;
    case 'filled':
      return `count(${valuesTarget}) > 0`;
    case 'isTrue':
      return `${target}.value == 'true'`;
    case 'isFalse':
      return `${target}.value == 'false'`;
  }
}

export function buildCondition(spec: ConditionSpec): string {
  const fieldKey = quote(spec.fieldId);
  if (spec.groupId && spec.itemIndex && spec.itemIndex > 0) {
    // 件数が足りないときに items[N] を読まないよう、先に件数を確かめる
    const items = `groups[${quote(spec.groupId)}].items`;
    const field = `${items}[${spec.itemIndex - 1}].field(${fieldKey})`;
    return `\${count(${items}) >= ${spec.itemIndex} && ${predicate(field, `${field}.values`, spec)}}`;
  }
  if (spec.groupId) {
    const field = `m.field(${fieldKey})`;
    return `\${count(filter(groups[${quote(spec.groupId)}].items, (m) -> ${predicate(field, `${field}.values`, spec)})) > 0}`;
  }
  const field = `fields[${fieldKey}]`;
  return `\${${predicate(field, `${field}.values`, spec)}}`;
}

/** その種類の項目で使える比べ方。 */
export function operatorsFor(blockType: string): ConditionOperator[] {
  switch (blockType) {
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
    case 'CHECKBOX':
      return ['includes', 'filled'];
    case 'BOOLEAN':
      return ['isTrue', 'isFalse'];
    default:
      return ['equals', 'filled'];
  }
}
