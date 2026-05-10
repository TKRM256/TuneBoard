/** Builds a flat, label-first catalog of the available variables that can be
 *  inserted into the PDF canvas. UUIDs are kept for the wire format but never
 *  shown to the user — labels are the primary key for browsing. Repeatable
 *  groups, variants, and nested groups are all surfaced so users can pick any
 *  field by name even if it lives several levels deep. */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';

export interface CatalogEntry {
  id: string;
  /** Human-friendly label shown in the palette. */
  label: string;
  /** Type label for the secondary line ("テキスト", "選択", etc.) */
  typeLabel: string;
  /** Hierarchy display path (e.g. "出演者 > 氏名"). */
  pathLabel: string;
  /** Variant ids in which this field appears (only set for fields inside a
   *  REPEATABLE_GROUP that defines variants). */
  variantIds?: string[];
}

export interface CatalogVariant {
  id: string;
  label: string;
  fields: CatalogEntry[];
}

export interface CatalogGroup {
  id: string;
  label: string;
  /** Group id used for `groups['id']` lookup. */
  fieldId: string;
  /** Hierarchy path including parent group(s). */
  pathLabel: string;
  /** Direct leaf fields (union across variants when applicable). */
  fields: CatalogEntry[];
  /** If the group uses variants, each variant's fields. */
  variants: CatalogVariant[];
  /** Nested repeatable groups inside this group. */
  childGroups: CatalogGroup[];
}

export interface FieldCatalog {
  /** Top-level scalar fields (excluding fields nested inside repeatable groups). */
  fields: CatalogEntry[];
  /** Each top-level repeatable group, with its leaf fields & nested groups. */
  groups: CatalogGroup[];
  /** Lookup by field/group id → label/path (used by canvas elements to display
   *  readable names and hover info). */
  labelById: Map<string, { label: string; path: string }>;
}

export function buildFieldCatalog(config: SettingSheetConfigResponse | null | undefined): FieldCatalog {
  const labelById = new Map<string, { label: string; path: string }>();

  const visit = (blocks: SettingSheetBlock[], pathPrefix: string[]): { fields: CatalogEntry[]; groups: CatalogGroup[] } => {
    const fields: CatalogEntry[] = [];
    const groups: CatalogGroup[] = [];
    for (const block of blocks ?? []) {
      if (block.type === 'SECTION') {
        const nested = visit(block.fields ?? [], [...pathPrefix, block.label]);
        fields.push(...nested.fields);
        groups.push(...nested.groups);
      } else if (block.type === 'REPEATABLE_GROUP') {
        const groupPath = [...pathPrefix, block.label];
        const group = collectGroup(block, groupPath, labelById);
        groups.push(group);
        labelById.set(block.id, { label: block.label, path: groupPath.join(' > ') });
      } else {
        const entry = makeEntry(block, [...pathPrefix, block.label]);
        fields.push(entry);
        labelById.set(block.id, { label: block.label, path: entry.pathLabel });
      }
    }
    return { fields, groups };
  };

  if (!config) return { fields: [], groups: [], labelById };
  const { fields, groups } = visit(config.blocks, []);
  return { fields, groups, labelById };
}

function collectGroup(
  block: SettingSheetBlock,
  pathPrefix: string[],
  labelById: Map<string, { label: string; path: string }>,
): CatalogGroup {
  const variants: CatalogVariant[] = [];
  const fieldUnion = new Map<string, CatalogEntry>();
  const childGroupUnion = new Map<string, CatalogGroup>();

  const variantSources = block.variants && block.variants.length > 0
    ? block.variants.map((v) => ({ id: v.id, label: v.label, fields: v.fields ?? [] }))
    : [{ id: '', label: '', fields: block.fields ?? [] }];

  for (const variant of variantSources) {
    const variantFields: CatalogEntry[] = [];
    const flattened = flattenSections(variant.fields);
    for (const child of flattened) {
      if (child.type === 'REPEATABLE_GROUP') {
        const nestedPath = [...pathPrefix, child.label];
        const nested = collectGroup(child, nestedPath, labelById);
        if (!childGroupUnion.has(nested.id)) childGroupUnion.set(nested.id, nested);
        labelById.set(child.id, { label: child.label, path: nestedPath.join(' > ') });
        continue;
      }
      const entry = makeEntry(child, [...pathPrefix, child.label]);
      if (variant.id) entry.variantIds = (entry.variantIds ?? []).concat(variant.id);
      variantFields.push(entry);
      const existing = fieldUnion.get(entry.id);
      if (existing) {
        if (variant.id) existing.variantIds = Array.from(new Set([...(existing.variantIds ?? []), variant.id]));
      } else {
        fieldUnion.set(entry.id, { ...entry });
      }
      labelById.set(child.id, { label: child.label, path: entry.pathLabel });
    }
    if (block.variants && block.variants.length > 0) {
      variants.push({ id: variant.id, label: variant.label, fields: variantFields });
    }
  }

  return {
    id: block.id,
    label: block.label,
    fieldId: block.id,
    pathLabel: pathPrefix.join(' > '),
    fields: Array.from(fieldUnion.values()),
    variants,
    childGroups: Array.from(childGroupUnion.values()),
  };
}

function flattenSections(blocks: SettingSheetBlock[]): SettingSheetBlock[] {
  const out: SettingSheetBlock[] = [];
  for (const b of blocks) {
    if (b.type === 'SECTION') out.push(...flattenSections(b.fields ?? []));
    else out.push(b);
  }
  return out;
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
