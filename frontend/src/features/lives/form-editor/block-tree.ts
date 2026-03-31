/** ブロックツリーの不変操作関数群 (移動・更新・削除・挿入・バリアントCRUD) */
import {
  canContainBlocks,
  type SettingSheetBlock,
  type SettingSheetGroupVariant,
} from '../types/live-types';

/** variants 配列内の fields に対して再帰操作を適用し、変更があれば新しい variants を返す */
function mapVariants(
  variants: SettingSheetGroupVariant[] | undefined,
  fn: (fields: SettingSheetBlock[]) => SettingSheetBlock[],
): { nextVariants: SettingSheetGroupVariant[] | undefined; variantsChanged: boolean } {
  if (!variants?.length) return { nextVariants: variants, variantsChanged: false };
  let variantsChanged = false;
  const nextVariants = variants.map((v) => {
    const nextFields = fn(v.fields);
    if (nextFields !== v.fields) {
      variantsChanged = true;
      return { ...v, fields: nextFields };
    }
    return v;
  });
  return { nextVariants: variantsChanged ? nextVariants : variants, variantsChanged };
}

/** parentId がバリアント ID に一致する場合、そのバリアントの fields を操作する */
function withVariantAsParent(
  block: SettingSheetBlock,
  parentId: string,
  fn: (fields: SettingSheetBlock[]) => SettingSheetBlock[],
): SettingSheetBlock | null {
  if (!block.variants?.length) return null;
  const vi = block.variants.findIndex((v) => v.id === parentId);
  if (vi < 0) return null;
  const variant = block.variants[vi];
  const nextFields = fn(variant.fields);
  if (nextFields === variant.fields) return block;
  const nextVariants = [...block.variants];
  nextVariants[vi] = { ...variant, fields: nextFields };
  return { ...block, variants: nextVariants };
}

const moveBlock = (blocks: SettingSheetBlock[], blockIndex: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) {
    return blocks;
  }

  const next = [...blocks];
  [next[blockIndex], next[targetIndex]] = [next[targetIndex], next[blockIndex]];
  return next;
};

export const updateBlockTree = (
  blocks: SettingSheetBlock[],
  blockId: string,
  updater: (block: SettingSheetBlock) => SettingSheetBlock,
): SettingSheetBlock[] => {
  let changed = false;
  const nextBlocks = blocks.map((block) => {
    if (block.id === blockId) {
      const updated = updater(block);
      if (updated !== block) {
        changed = true;
      }
      return updated;
    }
    if (!canContainBlocks(block.type)) {
      return block;
    }
    let blockChanged = false;
    const nextFields = updateBlockTree(block.fields, blockId, updater);
    if (nextFields !== block.fields) blockChanged = true;
    const { nextVariants, variantsChanged } = mapVariants(block.variants, (f) => updateBlockTree(f, blockId, updater));
    if (variantsChanged) blockChanged = true;
    if (!blockChanged) return block;
    changed = true;
    return { ...block, fields: nextFields, variants: nextVariants };
  });

  return changed ? nextBlocks : blocks;
};

export const removeBlockTree = (blocks: SettingSheetBlock[], blockId: string): SettingSheetBlock[] => {
  let changed = false;
  const nextBlocks: SettingSheetBlock[] = [];

  for (const block of blocks) {
    if (block.id === blockId) {
      changed = true;
      continue;
    }

    if (!canContainBlocks(block.type)) {
      nextBlocks.push(block);
      continue;
    }

    let blockChanged = false;
    const nextFields = removeBlockTree(block.fields, blockId);
    if (nextFields !== block.fields) blockChanged = true;
    const { nextVariants, variantsChanged } = mapVariants(block.variants, (f) => removeBlockTree(f, blockId));
    if (variantsChanged) blockChanged = true;

    if (!blockChanged) {
      nextBlocks.push(block);
      continue;
    }
    changed = true;
    nextBlocks.push({ ...block, fields: nextFields, variants: nextVariants });
  }

  return changed ? nextBlocks : blocks;
};

export const insertChildBlock = (
  blocks: SettingSheetBlock[],
  parentId: string | null,
  insertIndex: number,
  child: SettingSheetBlock,
): SettingSheetBlock[] => {
  if (!parentId) {
    const next = [...blocks];
    next.splice(insertIndex, 0, child);
    return next;
  }

  let changed = false;
  const nextBlocks = blocks.map((block) => {
    if (block.id === parentId && canContainBlocks(block.type)) {
      const nextFields = [...block.fields];
      nextFields.splice(insertIndex, 0, child);
      changed = true;
      return { ...block, fields: nextFields };
    }
    // parentId がこのブロックのバリアント ID に一致する場合
    const variantResult = withVariantAsParent(block, parentId, (fields) => {
      const next = [...fields];
      next.splice(insertIndex, 0, child);
      return next;
    });
    if (variantResult && variantResult !== block) {
      changed = true;
      return variantResult;
    }
    if (!canContainBlocks(block.type)) {
      return block;
    }
    let blockChanged = false;
    const nextFields = insertChildBlock(block.fields, parentId, insertIndex, child);
    if (nextFields !== block.fields) blockChanged = true;
    const { nextVariants, variantsChanged } = mapVariants(block.variants, (f) => insertChildBlock(f, parentId, insertIndex, child));
    if (variantsChanged) blockChanged = true;
    if (!blockChanged) return block;
    changed = true;
    return { ...block, fields: nextFields, variants: nextVariants };
  });

  return changed ? nextBlocks : blocks;
};

export const moveBlockTree = (
  blocks: SettingSheetBlock[],
  parentId: string | null,
  blockIndex: number,
  direction: 'up' | 'down',
): SettingSheetBlock[] => {
  if (!parentId) {
    return moveBlock(blocks, blockIndex, direction);
  }

  let changed = false;
  const nextBlocks = blocks.map((block) => {
    if (block.id === parentId && canContainBlocks(block.type)) {
      const nextFields = moveBlock(block.fields, blockIndex, direction);
      if (nextFields === block.fields) {
        return block;
      }
      changed = true;
      return { ...block, fields: nextFields };
    }
    // parentId がこのブロックのバリアント ID に一致する場合
    const variantResult = withVariantAsParent(block, parentId, (fields) => moveBlock(fields, blockIndex, direction));
    if (variantResult && variantResult !== block) {
      changed = true;
      return variantResult;
    }
    if (!canContainBlocks(block.type)) {
      return block;
    }
    let blockChanged = false;
    const nextFields = moveBlockTree(block.fields, parentId, blockIndex, direction);
    if (nextFields !== block.fields) blockChanged = true;
    const { nextVariants, variantsChanged } = mapVariants(block.variants, (f) => moveBlockTree(f, parentId, blockIndex, direction));
    if (variantsChanged) blockChanged = true;
    if (!blockChanged) return block;
    changed = true;
    return { ...block, fields: nextFields, variants: nextVariants };
  });

  return changed ? nextBlocks : blocks;
};

export const getSiblingCount = (blocks: SettingSheetBlock[], parentId: string | null): number => {
  if (!parentId) {
    return blocks.length;
  }

  for (const block of blocks) {
    if (block.id === parentId && canContainBlocks(block.type)) {
      return block.fields.length;
    }
    // parentId がバリアント ID に一致する場合
    for (const v of block.variants ?? []) {
      if (v.id === parentId) return v.fields.length;
    }
    if (canContainBlocks(block.type)) {
      const nested = getSiblingCount(block.fields, parentId);
      if (nested >= 0) return nested;
      for (const v of block.variants ?? []) {
        const vNested = getSiblingCount(v.fields, parentId);
        if (vNested >= 0) return vNested;
      }
    }
  }

  return -1;
};
