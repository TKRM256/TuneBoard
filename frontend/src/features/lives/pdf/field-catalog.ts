/** Builds a flat, label-first catalog of the available variables that can be
 *  inserted into the PDF canvas. UUIDs are kept for the wire format but never
 *  shown to the user — labels are the primary key for browsing. */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';

export interface CatalogEntry {
  id: string;
  /** Human-friendly label shown in the palette. */
  label: string;
  /** Type label for the secondary line ("テキスト", "選択", etc.) */
  typeLabel: string;
  /** Hierarchy display path (e.g. "出演者 > 氏名"). */
  pathLabel: string;
}

export interface CatalogGroup {
  id: string;
  label: string;
  fieldId: string;
  fields: CatalogEntry[];
}

export interface FieldCatalog {
  /** Top-level scalar fields (excluding fields nested inside repeatable groups). */
  fields: CatalogEntry[];
  /** Each repeatable group, with the leaf fields it contains. */
  groups: CatalogGroup[];
  /** Lookup by field id → label/path (used by canvas elements to display readable names). */
  labelById: Map<string, { label: string; path: string }>;
}

export function buildFieldCatalog(config: SettingSheetConfigResponse | null | undefined): FieldCatalog {
  const fields: CatalogEntry[] = [];
  const groups: CatalogGroup[] = [];
  const labelById = new Map<string, { label: string; path: string }>();
  if (!config) return { fields, groups, labelById };

  const visit = (blocks: SettingSheetBlock[], path: string[]) => {
    for (const block of blocks) {
      if (block.type === 'SECTION') {
        visit(block.fields ?? [], [...path, block.label]);
      } else if (block.type === 'REPEATABLE_GROUP') {
        const groupPath = [...path, block.label];
        const variantFields = block.variants && block.variants.length > 0
          ? block.variants[0].fields ?? []
          : block.fields ?? [];
        const groupEntries: CatalogEntry[] = [];
        for (const f of variantFields) {
          if (f.type === 'SECTION' || f.type === 'REPEATABLE_GROUP') continue;
          const entry = makeEntry(f, [...groupPath, f.label]);
          groupEntries.push(entry);
          labelById.set(f.id, { label: f.label, path: entry.pathLabel });
        }
        groups.push({
          id: block.id,
          label: block.label,
          fieldId: block.id,
          fields: groupEntries,
        });
        labelById.set(block.id, { label: block.label, path: groupPath.join(' > ') });
      } else {
        const entry = makeEntry(block, [...path, block.label]);
        fields.push(entry);
        labelById.set(block.id, { label: block.label, path: entry.pathLabel });
      }
    }
  };

  visit(config.blocks, []);
  return { fields, groups, labelById };
}

function makeEntry(block: SettingSheetBlock, path: string[]): CatalogEntry {
  return {
    id: block.id,
    label: block.label,
    typeLabel: typeLabel(block.type),
    pathLabel: path.join(' > '),
  };
}

function typeLabel(type: string): string {
  switch (type) {
    case 'SHORT_TEXT': return 'テキスト';
    case 'LONG_TEXT': return '長文';
    case 'SINGLE_SELECT': return '単一選択';
    case 'MULTI_SELECT': return '複数選択';
    case 'CHECKBOX': return 'チェック';
    case 'BOOLEAN': return '真偽値';
    case 'SONG': return '楽曲';
    default: return '';
  }
}
