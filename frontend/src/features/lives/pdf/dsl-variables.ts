/** Builds the list of insertable variables/snippets for the DSL editor. */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';

export interface VariableEntry {
  /** The text inserted at the cursor. */
  insert: string;
  /** Friendly label shown in the panel. */
  label: string;
  /** Optional inline help shown next to the label. */
  hint?: string;
  /** Indentation depth (for tree display). */
  depth: number;
  /** When true, render as a section heading (no insert). */
  heading?: boolean;
}

export interface VariableGroup {
  title: string;
  icon: string;
  entries: VariableEntry[];
}

const HELPERS: VariableEntry[] = [
  { insert: '${boolMark(value)}', label: 'boolMark(値)', hint: 'true→○ / false→×', depth: 0 },
  { insert: "${join(values, ' / ')}", label: 'join(配列, 区切り)', hint: '配列を区切り結合', depth: 0 },
  { insert: '${truncate(text, 30)}', label: 'truncate(文字列, n)', hint: '末尾省略', depth: 0 },
  { insert: "${formatDate(date, 'M月d日')}", label: 'formatDate(日付, 形式)', hint: '日付整形', depth: 0 },
  { insert: "${defaultTo(value, '—')}", label: 'defaultTo(値, 代替)', hint: '空のフォールバック', depth: 0 },
  { insert: '${count(items)}', label: 'count(リスト)', hint: '件数', depth: 0 },
  { insert: "${contains(values, 'Vo')}", label: 'contains(配列, 値)', hint: '含むか', depth: 0 },
];

const LIVE_VARS: VariableEntry[] = [
  { insert: '${live.name}', label: 'live.name', hint: 'ライブ名', depth: 0 },
  { insert: "${formatDate(live.date, 'yyyy/M/d')}", label: 'live.date', hint: '開催日', depth: 0 },
  { insert: '${live.location}', label: 'live.location', hint: '会場', depth: 0 },
  { insert: '${live.tenantName}', label: 'live.tenantName', hint: 'テナント名', depth: 0 },
  { insert: "${formatDate(live.deadlineAt, 'M月d日 HH:mm')}", label: 'live.deadlineAt', hint: '回答締切', depth: 0 },
];

const SUBMISSION_VARS: VariableEntry[] = [
  { insert: '${submission.label}', label: 'submission.label', hint: '自動生成の見出し', depth: 0 },
  { insert: "${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}", label: 'submission.submittedAt', hint: '提出日時', depth: 0 },
  { insert: '${submission.status}', label: 'submission.status', hint: '提出状況', depth: 0 },
];

export function buildVariableGroups(config: SettingSheetConfigResponse | null): VariableGroup[] {
  return [
    { title: 'ライブ情報', icon: '🎤', entries: LIVE_VARS },
    { title: '提出情報', icon: '📝', entries: SUBMISSION_VARS },
    { title: 'フィールド', icon: '🏷️', entries: config ? collectFieldEntries(config.blocks, 0) : [] },
    { title: 'ヘルパー関数', icon: '🛠', entries: HELPERS },
  ];
}

function collectFieldEntries(blocks: SettingSheetBlock[], depth: number): VariableEntry[] {
  const entries: VariableEntry[] = [];
  for (const block of blocks) {
    if (block.type === 'SECTION') {
      entries.push({ insert: '', label: block.label, depth, heading: true });
      if (block.fields?.length) {
        entries.push(...collectFieldEntries(block.fields, depth + 1));
      }
    } else if (block.type === 'REPEATABLE_GROUP') {
      entries.push({ insert: '', label: `${block.label}（繰り返し）`, depth, heading: true });
      entries.push({
        insert: `\${groups['${block.id}'].items}`,
        label: `groups['${block.id}'].items`,
        hint: '全アイテム',
        depth: depth + 1,
      });
      entries.push({
        insert: `\${groups['${block.id}'].count}`,
        label: `groups['${block.id}'].count`,
        hint: '件数',
        depth: depth + 1,
      });
      entries.push({
        insert: buildForEachSnippet(block),
        label: '+ for-each 雛形を挿入',
        hint: '繰り返しブロック',
        depth: depth + 1,
      });
      const variantFields = block.variants && block.variants.length > 0
        ? block.variants.flatMap((v) => v.fields)
        : (block.fields ?? []);
      if (variantFields.length > 0) {
        entries.push(...collectItemFieldEntries(variantFields, depth + 1, 'm'));
      }
    } else {
      entries.push({
        insert: `\${fields['${block.id}'].value}`,
        label: `fields['${block.id}'].value`,
        hint: block.label,
        depth,
      });
    }
  }
  return entries;
}

function collectItemFieldEntries(blocks: SettingSheetBlock[], depth: number, varName: string): VariableEntry[] {
  const entries: VariableEntry[] = [];
  for (const block of blocks) {
    if (block.type === 'SECTION' || block.type === 'REPEATABLE_GROUP') continue;
    entries.push({
      insert: `\${${varName}.field('${block.id}').value}`,
      label: `${varName}.field('${block.id}').value`,
      hint: block.label,
      depth,
    });
  }
  return entries;
}

function buildForEachSnippet(group: SettingSheetBlock): string {
  const fields = group.variants && group.variants.length > 0
    ? group.variants[0].fields
    : (group.fields ?? []);
  const titleField = fields[0];
  const remainingFields = fields.slice(1).filter((f) => f.type !== 'SECTION' && f.type !== 'REPEATABLE_GROUP');
  const titleExpr = titleField
    ? `(m.index + 1) + '. ' + m.field('${titleField.id}').value`
    : `(m.index + 1) + '. アイテム'`;
  const renderEntries = remainingFields.slice(0, 3).map((f) => `      - { type: text, label: '${f.label}', text: "\${m.field('${f.id}').value}" }`).join('\n');
  return [
    `- type: for-each`,
    `  items: "\${groups['${group.id}'].items}"`,
    `  as: m`,
    `  render:`,
    `    - type: section`,
    `      title: "\${${titleExpr}}"`,
    `      render:`,
    renderEntries || `      - { type: text, text: "(項目をここに追加)" }`,
  ].join('\n');
}
