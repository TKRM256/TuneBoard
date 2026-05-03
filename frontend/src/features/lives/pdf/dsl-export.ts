/** Convert the Simple-mode options into a starter YAML template the user can edit. */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';
import type { PdfLayoutOptions } from './pdf-options';

export function buildStarterYaml(options: PdfLayoutOptions, config: SettingSheetConfigResponse | null): string {
  const lines: string[] = [];
  lines.push('# 自動生成のテンプレート — 自由に編集してください。');
  lines.push("# `${...}` で式を埋め込めます。右上の「変数を挿入」を活用してください。");
  lines.push('');
  lines.push('page:');
  lines.push(`  size: ${options.paperSize}`);
  lines.push(`  orientation: ${options.orientation}`);
  lines.push(`  margin: ${options.marginMm}`);
  lines.push(`  fontSize: ${options.baseFontSize}`);
  lines.push('');
  lines.push('rows:');
  lines.push('  # ── ヘッダー ──');
  lines.push('  - type: title');
  lines.push("    text: \"${submission.label}\"");
  lines.push('    size: 16');
  lines.push('  - type: hr');
  lines.push('');

  if (!config) {
    lines.push('  # フォーム定義が読み込めませんでした');
    return lines.join('\n');
  }

  const { infoFields, groups } = categorize(config.blocks);
  const firstGroup = groups[0];

  if (infoFields.length > 0 && firstGroup) {
    lines.push('  # ── 上段: 基本情報 + ' + firstGroup.label + ' ──');
    lines.push('  - type: row');
    lines.push('    columns:');
    lines.push('      - width: 0.38');
    lines.push('        render:');
    lines.push(...renderInfoStack(infoFields, '          '));
    lines.push('      - width: 0.62');
    lines.push('        render:');
    lines.push(...renderGroupTable(firstGroup, '          '));
  } else if (infoFields.length > 0) {
    lines.push('  # ── 基本情報 ──');
    lines.push(...renderInfoStack(infoFields, '  '));
  } else if (firstGroup) {
    lines.push(`  # ── ${firstGroup.label} ──`);
    lines.push(...renderGroupTable(firstGroup, '  '));
  }

  for (let i = 1; i < groups.length; i++) {
    lines.push('');
    lines.push(`  # ── ${groups[i].label} ──`);
    lines.push(...renderGroupTable(groups[i], '  '));
  }

  return lines.join('\n') + '\n';
}

interface Categorized {
  infoFields: SettingSheetBlock[];
  groups: SettingSheetBlock[];
}

function categorize(blocks: SettingSheetBlock[]): Categorized {
  const info: SettingSheetBlock[] = [];
  const groups: SettingSheetBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'REPEATABLE_GROUP') {
      groups.push(block);
    } else if (block.type === 'SECTION') {
      const nested = categorize(block.fields ?? []);
      info.push(...nested.infoFields);
      groups.push(...nested.groups);
    } else {
      info.push(block);
    }
  }
  return { infoFields: info, groups };
}

function renderInfoStack(fields: SettingSheetBlock[], indent: string): string[] {
  const out: string[] = [];
  out.push(`${indent}- type: text`);
  out.push(`${indent}  label: "最終更新日"`);
  out.push(`${indent}  text: "\${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}"`);
  for (const f of fields) {
    out.push(`${indent}- type: field`);
    out.push(`${indent}  fieldId: ${f.id}`);
    out.push(`${indent}  label: ${yamlString(f.label)}`);
  }
  return out;
}

function renderGroupTable(group: SettingSheetBlock, indent: string): string[] {
  const fields = group.variants && group.variants.length > 0
    ? group.variants[0].fields
    : (group.fields ?? []);
  const leafFields = fields.filter((f) => f.type !== 'SECTION' && f.type !== 'REPEATABLE_GROUP').slice(0, 6);
  if (leafFields.length === 0) {
    return [`${indent}- { type: text, text: "(項目なし)" }`];
  }
  const out: string[] = [];
  out.push(`${indent}- type: table`);
  out.push(`${indent}  rows: "\${groups['${group.id}'].items}"`);
  out.push(`${indent}  rowVar: m`);
  out.push(`${indent}  columns:`);
  out.push(`${indent}    - header: "No"`);
  out.push(`${indent}      width: 0.06`);
  out.push(`${indent}      align: center`);
  out.push(`${indent}      value: "\${m.index + 1}"`);
  for (const f of leafFields) {
    const width = (0.94 / leafFields.length).toFixed(2);
    out.push(`${indent}    - header: ${yamlString(f.label)}`);
    out.push(`${indent}      width: ${width}`);
    if (f.type === 'BOOLEAN') {
      out.push(`${indent}      align: center`);
      out.push(`${indent}      value: "\${m.field('${f.id}').value == 'true' ? '○' : ''}"`);
    } else if (f.type === 'MULTI_SELECT' || f.type === 'CHECKBOX') {
      out.push(`${indent}      value: "\${join(m.field('${f.id}').values, '\\n')}"`);
    } else {
      out.push(`${indent}      value: "\${m.field('${f.id}').value}"`);
    }
  }
  return out;
}

function yamlString(s: string): string {
  if (!s) return '""';
  if (/[:#\-[\]{}&*!|>'"%@`]/.test(s) || s.includes('\n') || s.startsWith(' ') || s.endsWith(' ')) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
