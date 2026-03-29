/** ブロックツリーの不変操作関数群 (移動・更新・削除・挿入) */
import {
  canContainBlocks,
  type SettingSheetBlock,
} from '../types/live-types';

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
    const nextFields = updateBlockTree(block.fields, blockId, updater);
    if (nextFields === block.fields) {
      return block;
    }
    changed = true;
    return {
      ...block,
      fields: nextFields,
    };
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

    const nextFields = removeBlockTree(block.fields, blockId);
    if (nextFields === block.fields) {
      nextBlocks.push(block);
      continue;
    }

    changed = true;
    nextBlocks.push({ ...block, fields: nextFields });
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
    if (!canContainBlocks(block.type)) {
      return block;
    }
    const nextFields = insertChildBlock(block.fields, parentId, insertIndex, child);
    if (nextFields === block.fields) {
      return block;
    }
    changed = true;
    return { ...block, fields: nextFields };
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
    if (!canContainBlocks(block.type)) {
      return block;
    }
    const nextFields = moveBlockTree(block.fields, parentId, blockIndex, direction);
    if (nextFields === block.fields) {
      return block;
    }
    changed = true;
    return { ...block, fields: nextFields };
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
    if (canContainBlocks(block.type)) {
      const nested = getSiblingCount(block.fields, parentId);
      if (nested >= 0) {
        return nested;
      }
    }
  }

  return -1;
};
