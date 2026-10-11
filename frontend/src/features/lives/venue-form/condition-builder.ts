/** 表示条件の作成補助。項目と比べ方を選ぶと、JEXL の式（`${...}`）を組み立てる。 */

export type ConditionOperator = 'includes' | 'equals' | 'filled' | 'isTrue';

export interface ConditionSpec {
  fieldId: string;
  /** グループの中の項目なら、そのグループ。「いずれかの件で」満たせば真になる */
  groupId?: string | null;
  operator: ConditionOperator;
  value?: string;
}

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  includes: 'に次の選択肢が含まれる',
  equals: 'が次と等しい',
  filled: 'が入力されている',
  isTrue: 'がオン（はい）',
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
  }
}

export function buildCondition(spec: ConditionSpec): string {
  const fieldKey = quote(spec.fieldId);
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
      return ['isTrue'];
    default:
      return ['equals', 'filled'];
  }
}
