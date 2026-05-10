/** CodeMirror completion source that provides JEXL expression suggestions
 *  derived from the FieldCatalog: field/group IDs, helper function snippets,
 *  and item method completions. */
import { type Completion, type CompletionContext, snippetCompletion } from '@codemirror/autocomplete';

import type { CatalogGroup, FieldCatalog } from '../field-catalog';

const HELPER_COMPLETIONS: Completion[] = [
  snippetCompletion("mapJoin(${1:groups['id'].items}, (m) -> ${2:m.field('field-id').value}, '${3: / }')", {
    label: 'mapJoin', detail: '(items, fn, sep)', info: 'グループ全件を変換して結合', type: 'function',
  }),
  snippetCompletion("joinField(${1:groups['id']}, '${2:field-id}', '${3: / }')", {
    label: 'joinField', detail: '(group, fieldId, sep)', info: '単一フィールドを全件 join', type: 'function',
  }),
  snippetCompletion("count(${1:groups['id']})", {
    label: 'count', detail: '(group)', info: 'グループの件数', type: 'function',
  }),
  snippetCompletion("filter(${1:groups['id'].items}, (m) -> ${2:m.field('field-id').value == 'x'})", {
    label: 'filter', detail: '(items, predicate)', info: '条件に合うアイテムを抽出', type: 'function',
  }),
  snippetCompletion("find(${1:groups['id'].items}, (m) -> ${2:m.field('field-id').value == 'x'})", {
    label: 'find', detail: '(items, predicate)', info: '最初のマッチを返す', type: 'function',
  }),
  snippetCompletion("map(${1:groups['id'].items}, (m) -> ${2:m.field('field-id').value})", {
    label: 'map', detail: '(items, fn)', info: '各アイテムを変換してリストに', type: 'function',
  }),
  snippetCompletion("formatDate(${1:live.date}, '${2:yyyy/M/d}')", {
    label: 'formatDate', detail: '(date, pattern)', info: '日付フォーマット', type: 'function',
  }),
  snippetCompletion("boolMark(${1:value})", {
    label: 'boolMark', detail: '(value) → ○/×', info: 'true→○ / false→×', type: 'function',
  }),
  snippetCompletion("defaultTo(${1:value}, '${2:—}')", {
    label: 'defaultTo', detail: '(value, fallback)', info: '空のときフォールバック', type: 'function',
  }),
  snippetCompletion("truncate(${1:value}, ${2:20})", {
    label: 'truncate', detail: '(value, max)', info: '文字数を切り詰める', type: 'function',
  }),
  { label: 'join', detail: '(list, sep)', info: 'リストを文字列結合', type: 'function' },
  { label: 'pluck', detail: '(group, fieldId)', info: 'フィールド値をリストに', type: 'function' },
  { label: 'filterEquals', detail: '(group, fieldId, value)', info: '等値でフィルタ', type: 'function' },
  { label: 'contains', detail: '(list, value)', info: 'リストに含まれるか', type: 'function' },
];

const TOP_LEVEL_COMPLETIONS: Completion[] = [
  { label: 'live', detail: 'name, date, location, tenantName', type: 'variable' },
  { label: 'submission', detail: 'submittedAt', type: 'variable' },
  { label: 'fields', detail: "fields['field-id']", type: 'variable' },
  { label: 'groups', detail: "groups['group-id']", type: 'variable' },
];

const ITEM_COMPLETIONS: Completion[] = [
  { label: 'value', type: 'property' },
  { label: 'values', type: 'property' },
  { label: 'isEmpty', type: 'property' },
  { label: 'items', type: 'property' },
  { label: 'count', type: 'property' },
  snippetCompletion("field('${1:field-id}')", { label: 'field', detail: "(fieldId) → FieldRef", type: 'method' }),
  snippetCompletion("group('${1:group-id}')", { label: 'group', detail: "(groupId) → GroupRef", type: 'method' }),
];

function collectAllGroups(groups: CatalogGroup[]): Array<{ id: string; label: string; path: string }> {
  const out: Array<{ id: string; label: string; path: string }> = [];
  for (const g of groups) {
    out.push({ id: g.id, label: g.label, path: g.pathLabel });
    out.push(...collectAllGroups(g.childGroups));
  }
  return out;
}

export function makeCatalogCompletionSource(catalog: FieldCatalog) {
  return (ctx: CompletionContext) => {
    const text = ctx.state.doc.toString();
    const pos = ctx.pos;
    const before = text.slice(0, pos);

    // After fields[' — offer field ids with label display
    const fieldKeyMatch = /fields\['([^']*)$/.exec(before);
    if (fieldKeyMatch) {
      return {
        from: pos - fieldKeyMatch[1].length,
        options: catalog.fields.map((f) => ({
          label: f.id,
          displayLabel: f.label,
          detail: f.pathLabel,
          apply: f.id + "']",
          type: 'variable' as const,
        })),
        validFor: /^[^']*$/,
      };
    }

    // After groups[' — offer group ids with label display
    const groupKeyMatch = /groups\['([^']*)$/.exec(before);
    if (groupKeyMatch) {
      return {
        from: pos - groupKeyMatch[1].length,
        options: collectAllGroups(catalog.groups).map((g) => ({
          label: g.id,
          displayLabel: g.label,
          detail: g.path,
          apply: g.id + "']",
          type: 'variable' as const,
        })),
        validFor: /^[^']*$/,
      };
    }

    // After a dot — item method/property completions
    const dotMatch = /\.(\w*)$/.exec(before);
    if (dotMatch) {
      return {
        from: pos - dotMatch[1].length,
        options: ITEM_COMPLETIONS,
        validFor: /^\w*$/,
      };
    }

    // Inside ${...} or explicit trigger — top-level vars + helpers + field/group labels
    const exprMatch = /\$\{[^}]*$/.exec(before);
    if (exprMatch || ctx.explicit) {
      const wordMatch = /\w*$/.exec(before);
      const fieldLabelCompletions: typeof TOP_LEVEL_COMPLETIONS = catalog.fields.map((f) => ({
        label: f.label,
        detail: f.pathLabel,
        apply: `fields['${f.id}'].value`,
        type: 'variable' as const,
      }));
      const groupLabelCompletions: typeof TOP_LEVEL_COMPLETIONS = catalog.groups.map((g) => ({
        label: g.label,
        detail: g.pathLabel,
        apply: `groups['${g.id}'].items`,
        type: 'variable' as const,
      }));
      return {
        from: wordMatch ? pos - wordMatch[0].length : pos,
        options: [...TOP_LEVEL_COMPLETIONS, ...fieldLabelCompletions, ...groupLabelCompletions, ...HELPER_COMPLETIONS],
        validFor: /^\w*$/,
      };
    }

    return null;
  };
}
