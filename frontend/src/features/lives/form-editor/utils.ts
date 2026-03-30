import {
  canContainBlocks,
  canUseAsTitleSourceBlock,
  createBlockTemplate,
  isInputBlock,
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  isTextBlock,
  type SettingSheetBlock,
} from '../types/live-types';

export const widthOptions = [
  { value: 'full', label: '横幅いっぱい' },
  { value: 'two-thirds', label: '3カラム中2つ分' },
  { value: 'half', label: '2列の1カラム' },
  { value: 'third', label: '3カラム中1つ分' },
] as const;

export const optionColumnOptions = [1, 2, 3];

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

export const collectOptionSourceCandidates = (blocks: SettingSheetBlock[], trail: string[] = []) => {
  const candidates: Array<{ value: string; label: string }> = [];

  for (const block of blocks) {
    const nextTrail = [...trail, block.label];
    if (isRepeatableGroupBlock(block.type)) {
      for (const child of block.fields) {
        if (isInputBlock(child.type) && !isRepeatableGroupBlock(child.type)) {
          candidates.push({
            value: `${block.id}:${child.id}`,
            label: `${nextTrail.join(' / ')} -> ${child.label}`,
          });
        }
      }
      candidates.push(...collectOptionSourceCandidates(block.fields, nextTrail));
    } else if (isSectionBlock(block.type)) {
      candidates.push(...collectOptionSourceCandidates(block.fields, nextTrail));
    }
  }

  return candidates;
};

export const collectTitleSourceCandidates = (fields: SettingSheetBlock[]) => {
  return fields
    .filter((field) => canUseAsTitleSourceBlock(field.type))
    .map((field) => ({ value: field.id, label: field.label || field.id }));
};

export const summarizeBlock = (block: SettingSheetBlock) => {
  if (isSectionBlock(block.type)) {
    return `${block.fields.length}件の子ブロック`;
  }
  if (isRepeatableGroupBlock(block.type)) {
    return `${block.fields.length}件の子フィールド`;
  }
  if (isOptionBlock(block.type)) {
    return block.optionSource ? '外部参照の選択肢' : `${block.options.length}件の選択肢`;
  }
  if (block.type === 'SONG') {
    return '曲名・アーティスト名・iTunes検索';
  }
  return block.description?.trim() || '単体入力フィールド';
};

export const resolveSharedChildAppearance = (block: SettingSheetBlock) => {
  if (!canContainBlocks(block.type) || block.fields.length === 0) {
    return '';
  }

  const appearances = Array.from(new Set(block.fields.map((field) => field.appearance)));
  return appearances.length === 1 ? appearances[0] : '__mixed__';
};

const pickCompatibleChild = (block: SettingSheetBlock, nextType: SettingSheetBlock['type']) => {
  if (!canContainBlocks(block.type)) {
    return null;
  }

  if (block.titleSourceFieldId) {
    const preferred = block.fields.find((field) => field.id === block.titleSourceFieldId);
    if (preferred && (
      preferred.type === nextType
      || (isTextBlock(preferred.type) && isTextBlock(nextType))
      || (isOptionBlock(preferred.type) && isOptionBlock(nextType))
    )) {
      return preferred;
    }
  }

  return block.fields.find((field) => (
    field.type === nextType
    || (isTextBlock(field.type) && isTextBlock(nextType))
    || (isOptionBlock(field.type) && isOptionBlock(nextType))
  )) ?? null;
};

export const convertBlockForType = (block: SettingSheetBlock, nextType: SettingSheetBlock['type']) => {
  const template = createBlockTemplate(nextType);

  if (block.type === nextType) {
    return { ...block };
  }

  if (!canContainBlocks(block.type) && canContainBlocks(nextType)) {
    const child = {
      ...block,
      itemAppearance: 'plain' as const,
      titleSourceFieldId: '',
      fields: [],
      minItems: 0,
      addButtonLabel: '',
      entryTitle: '',
    };

    return {
      ...template,
      id: block.id,
      label: block.label,
      description: block.description,
      hidden: block.hidden,
      required: block.required,
      appearance: block.appearance,
      itemAppearance: nextType === 'REPEATABLE_GROUP'
        ? ((block.appearance === 'plain' ? 'outline' : block.appearance) as SettingSheetBlock['appearance'])
        : 'plain',
      layout: { ...template.layout, width: block.layout.width },
      titleSourceFieldId: nextType === 'REPEATABLE_GROUP' && canUseAsTitleSourceBlock(child.type) ? child.id : '',
      fields: [child],
    };
  }

  if (canContainBlocks(block.type) && !canContainBlocks(nextType)) {
    const compatibleChild = pickCompatibleChild(block, nextType);
    if (compatibleChild) {
      return {
        ...template,
        id: block.id,
        label: block.label,
        description: block.description,
        hidden: block.hidden,
        required: block.required,
        appearance: compatibleChild.appearance,
        options: isOptionBlock(nextType) ? [...compatibleChild.options] : [],
        layout: {
          ...template.layout,
          width: block.layout.width,
          optionColumns: isOptionBlock(nextType) ? compatibleChild.layout.optionColumns : template.layout.optionColumns,
          optionFitContent: isOptionBlock(nextType) ? compatibleChild.layout.optionFitContent : false,
        },
        optionSource: isOptionBlock(nextType) ? compatibleChild.optionSource : null,
      };
    }

    return {
      ...template,
      id: block.id,
      label: block.label,
      description: block.description,
      hidden: block.hidden,
      required: block.required,
      appearance: block.appearance,
      layout: { ...template.layout, width: block.layout.width },
    };
  }

  if (canContainBlocks(block.type) && canContainBlocks(nextType)) {
    return {
      ...template,
      id: block.id,
      label: block.label,
      description: block.description,
      hidden: block.hidden,
      required: nextType === 'REPEATABLE_GROUP' ? block.required : false,
      appearance: block.appearance,
      itemAppearance: nextType === 'REPEATABLE_GROUP' ? block.itemAppearance : 'plain',
      collapsible: nextType === 'REPEATABLE_GROUP' ? block.collapsible : false,
      minItems: nextType === 'REPEATABLE_GROUP' ? block.minItems : 0,
      addButtonLabel: nextType === 'REPEATABLE_GROUP' ? block.addButtonLabel : '',
      entryTitle: nextType === 'REPEATABLE_GROUP' ? block.entryTitle : '',
      titleSourceFieldId: nextType === 'REPEATABLE_GROUP' ? block.titleSourceFieldId : '',
      fields: block.fields,
      layout: { ...template.layout, width: block.layout.width },
    };
  }

  return {
    ...template,
    id: block.id,
    label: block.label,
    description: block.description,
    hidden: block.hidden,
    required: block.required,
    appearance: block.appearance,
    layout: {
      ...template.layout,
      width: block.layout.width,
      optionColumns: isOptionBlock(nextType) && isOptionBlock(block.type) ? block.layout.optionColumns : template.layout.optionColumns,
      optionFitContent: isOptionBlock(nextType) && isOptionBlock(block.type) ? block.layout.optionFitContent : false,
    },
    options: isOptionBlock(nextType) && isOptionBlock(block.type) ? [...block.options] : template.options,
    optionSource: isOptionBlock(nextType) && isOptionBlock(block.type) ? block.optionSource : null,
  };
};
