/** Builds the categorized list of `${...}` snippets shown in the expression
 *  picker. Snippets cover live/submission variables, every catalog field
 *  (recursively), join/filter helpers for repeatable groups, and the standard
 *  helper functions. */
import type { CatalogGroup, FieldCatalog } from '../field-catalog';

export interface SnippetEntry {
  label: string;
  /** Text inserted into the editor (without the surrounding `${}`). */
  expression: string;
  /** Optional one-line hint shown under the label. */
  hint?: string;
  /** Optional helper to filter when the user types in the search box. */
  keywords?: string;
}

export interface SnippetGroup {
  title: string;
  entries: SnippetEntry[];
}

export function buildSnippetGroups(catalog: FieldCatalog): SnippetGroup[] {
  const groups: SnippetGroup[] = [
    {
      title: 'ライブ・提出情報',
      entries: [
        { label: 'ライブ名', expression: 'live.name' },
        { label: '開催日', expression: "formatDate(live.date, 'yyyy/M/d')" },
        { label: '会場', expression: 'live.location' },
        { label: 'テナント名', expression: 'live.tenantName' },
        { label: '回答締切', expression: "formatDate(live.deadlineAt, 'M月d日 HH:mm')" },
        { label: '提出日時', expression: "formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')" },
      ],
    },
  ];

  if (catalog.fields.length > 0) {
    groups.push({
      title: 'フォーム項目（単発）',
      entries: catalog.fields.map((f) => ({
        label: f.label,
        expression: `fields['${f.id}'].value`,
        hint: `${f.pathLabel} (${f.typeLabel})`,
        keywords: f.label + ' ' + f.pathLabel,
      })),
    });
  }

  for (const group of catalog.groups) {
    pushGroupSnippets(group, groups, []);
  }

  groups.push({
    title: 'ヘルパー関数',
    entries: [
      { label: 'mapJoin(items, fn, 区切り)', expression: "mapJoin(groups['ID'].items, (m) -> m.field('field-id').value, ' / ')", hint: "ラムダで変換しながら全件結合 (推奨)。区切りに '\\n' で改行も可" },
      { label: 'map(items, fn)', expression: "map(groups['ID'].items, (m) -> m.field('field-id').value)", hint: '各アイテムをラムダで変換してリストに' },
      { label: 'filter(items, predicate)', expression: "filter(groups['ID'].items, (m) -> m.field('field-id').value == 'x')", hint: '条件に合うアイテムだけ抽出' },
      { label: 'find(items, predicate)', expression: "find(groups['ID'].items, (m) -> m.field('field-id').value == 'x')", hint: '最初のマッチを返す' },
      { label: 'join(配列, 区切り)', expression: "join(values, ' / ')", hint: '配列・グループを区切り結合' },
      { label: 'joinField(グループ, fieldId, 区切り)', expression: "joinField(groups['ID'], 'field-id', ' / ')", hint: '繰り返し項目から1フィールドを連結' },
      { label: 'pluck(グループ, fieldId)', expression: "pluck(groups['ID'], 'field-id')", hint: '繰り返し項目から1フィールドの配列を取得' },
      { label: 'filterEquals(グループ, fieldId, 値)', expression: "filterEquals(groups['ID'], 'field-id', 'true')", hint: '条件に合う行だけ抽出' },
      { label: 'count(リスト)', expression: 'count(values)', hint: '件数' },
      { label: 'boolMark(値)', expression: 'boolMark(value)', hint: 'true→○ / false→×' },
      { label: 'truncate(文字列, n)', expression: 'truncate(value, 30)', hint: '末尾省略' },
      { label: 'defaultTo(値, 代替)', expression: "defaultTo(value, '—')", hint: '空のときの代替' },
      { label: 'contains(配列, 値)', expression: "contains(values, 'Vo')", hint: '含むか判定' },
      { label: "formatDate(値, 'yyyy/M/d')", expression: "formatDate(date, 'yyyy/M/d')", hint: '日付整形' },
    ],
  });

  return groups;
}

function pushGroupSnippets(group: CatalogGroup, target: SnippetGroup[], parentIds: string[]): void {
  const groupRef = parentIds.length > 0
    ? buildItemPath(parentIds, group.fieldId)
    : `groups['${group.fieldId}']`;
  const entries: SnippetEntry[] = [];

  for (const f of group.fields) {
  entries.push({
      label: `${f.label} のid`,
      expression: `'${f.id}'`,
      hint: `${group.pathLabel} > ${f.label}`,
      keywords: f.label + f.id,
    });
  }

  if (group.fields.length > 0) {
    const first = group.fields[0];
    entries.push({
      label: 'groupのフィールド値',
      expression: parentIds.length > 0
        ? `${groupRef}`
        : `groups['${group.fieldId}']`,
      hint: `${first.label}`,
    });
  }

  target.push({
    title: `${group.label}（繰り返し）`,
    entries,
  });

  for (const child of group.childGroups) {
    pushGroupSnippets(child, target, [...parentIds, group.fieldId]);
  }
}

function buildItemPath(parentIds: string[], childId: string): string {
  // For a nested group "child" inside parent[0], expression becomes
  // `groups['parent'].items[0].group('child')`.
  if (parentIds.length === 0) return `groups['${childId}']`;
  const [first, ...rest] = parentIds;
  let expr = `groups['${first}']`;
  for (const id of rest) {
    expr += `.items[0].group('${id}')`;
  }
  expr += `.items[0].group('${childId}')`;
  return expr;
}
