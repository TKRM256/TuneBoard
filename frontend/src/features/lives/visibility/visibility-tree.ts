/** Tree operations for the visibility settings page. */
import { canContainBlocks, type SettingSheetBlock } from '../types/live-types';
import { isVisibleIn, type VisibilityField, type VisibilityScope } from './visibility-scopes';

function childrenOf(block: SettingSheetBlock): SettingSheetBlock[] {
  return [...block.fields, ...(block.variants ?? []).flatMap((variant) => variant.fields)];
}

function applyToDescendants(block: SettingSheetBlock, field: VisibilityField, value: boolean): SettingSheetBlock {
  return {
    ...block,
    [field]: value,
    fields: block.fields.map((child) => applyToDescendants(child, field, value)),
    variants: block.variants?.map((variant) => ({
      ...variant,
      fields: variant.fields.map((child) => applyToDescendants(child, field, value)),
    })),
  };
}

function updateTree(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: VisibilityField,
  value: boolean,
): SettingSheetBlock[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return applyToDescendants(block, field, value);
    }
    return {
      ...block,
      fields: updateTree(block.fields, blockId, field, value),
      variants: block.variants?.map((variant) => ({
        ...variant,
        fields: updateTree(variant.fields, blockId, field, value),
      })),
    };
  });
}

/** 親（セクション・繰り返しグループ）の状態を子から導出する。 */
function syncContainerStates(blocks: SettingSheetBlock[]): SettingSheetBlock[] {
  return blocks.map((block) => {
    const fields = syncContainerStates(block.fields);
    const variants = block.variants?.map((variant) => ({
      ...variant,
      fields: syncContainerStates(variant.fields),
    }));
    const descendants = [...fields, ...(variants ?? []).flatMap((variant) => variant.fields)];

    if (!canContainBlocks(block.type) || descendants.length === 0) {
      return { ...block, fields, variants };
    }

    return {
      ...block,
      // 子が1つでも見えていれば親も見えている扱いにする
      hidden: descendants.every((child) => child.hidden === true),
      publicVisible: descendants.some((child) => child.publicVisible === true),
      adminVisible: descendants.some((child) => child.adminVisible === true),
      fields,
      variants,
    };
  });
}

/** 指定ブロックとその配下の表示設定をまとめて切り替える。 */
export function setBlockVisibility(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: VisibilityField,
  value: boolean,
): SettingSheetBlock[] {
  return syncContainerStates(updateTree(blocks, blockId, field, value));
}

/** すべての項目の表示設定をまとめて切り替える（列の一括操作）。 */
export function setAllVisibility(
  blocks: SettingSheetBlock[],
  field: VisibilityField,
  value: boolean,
): SettingSheetBlock[] {
  return syncContainerStates(blocks.map((block) => applyToDescendants(block, field, value)));
}

/** 入力欄そのもの（コンテナ以外）の数。 */
export function countLeafBlocks(blocks: SettingSheetBlock[]): number {
  return blocks.reduce((count, block) => count + countNestedLeafBlocks(block), 0);
}

export function countNestedLeafBlocks(block: SettingSheetBlock): number {
  if (!canContainBlocks(block.type)) {
    return 1;
  }
  return childrenOf(block).reduce((count, child) => count + countNestedLeafBlocks(child), 0);
}

/** その表示先で見えている入力欄の数。 */
export function countVisibleLeafBlocks(blocks: SettingSheetBlock[], scope: VisibilityScope): number {
  return blocks.reduce((count, block) => {
    if (!canContainBlocks(block.type)) {
      return count + (isVisibleIn(block, scope) ? 1 : 0);
    }
    return count + countVisibleLeafBlocks(childrenOf(block), scope);
  }, 0);
}

/** 折りたたみ対象（子を持つブロックとバリエーション）のキー一覧。 */
export function collectCollapsibleKeys(blocks: SettingSheetBlock[]): string[] {
  const keys: string[] = [];
  for (const block of blocks) {
    const children = childrenOf(block);
    if (children.length > 0) {
      keys.push(block.id);
    }
    for (const variant of block.variants ?? []) {
      if (variant.fields.length > 0) {
        keys.push(`variant:${variant.id}`);
      }
    }
    keys.push(...collectCollapsibleKeys(children));
  }
  return keys;
}

export function resolveTypeLabel(type: SettingSheetBlock['type']): string {
  switch (type) {
    case 'SECTION':
      return '見出し';
    case 'SHORT_TEXT':
      return '短文';
    case 'LONG_TEXT':
      return '長文';
    case 'SINGLE_SELECT':
      return '単一選択';
    case 'MULTI_SELECT':
      return '複数選択';
    case 'CHECKBOX':
      return 'チェック';
    case 'BOOLEAN':
      return '真偽';
    case 'SONG':
      return '楽曲';
    case 'REPEATABLE_GROUP':
      return '繰り返し';
  }
}

/** 項目名・説明・種別のいずれかがヒットした枝だけを残す。 */
export function filterBlocksByQuery(blocks: SettingSheetBlock[], rawQuery: string): SettingSheetBlock[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return blocks;
  }

  return blocks.flatMap((block) => {
    const selfMatches = [block.label, block.description, resolveTypeLabel(block.type)]
      .some((value) => value.toLowerCase().includes(query));
    const filteredFields = selfMatches ? block.fields : filterBlocksByQuery(block.fields, query);
    const filteredVariants = (block.variants ?? []).flatMap((variant) => {
      const variantMatches = variant.label.toLowerCase().includes(query);
      const fields = selfMatches || variantMatches ? variant.fields : filterBlocksByQuery(variant.fields, query);
      return variantMatches || fields.length > 0 ? [{ ...variant, fields }] : [];
    });

    if (selfMatches || filteredFields.length > 0 || filteredVariants.length > 0) {
      return [{
        ...block,
        fields: filteredFields,
        variants: block.variants ? filteredVariants : block.variants,
      }];
    }

    return [];
  });
}
