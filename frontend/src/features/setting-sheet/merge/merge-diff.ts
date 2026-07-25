/**
 * base / 自分 / 相手 を突き合わせて、元のフォームと同じ構造の比較ツリーを組み立てる。
 * マージ画面はこのツリーをそのまま左右 2 列で描画し、
 * 差分のあるフィールドだけが選択対象になる。
 */
import {
  getGroupItemFields,
  isRepeatableGroupBlock,
  isSectionBlock,
  isSongBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import type {
  SettingSheetFieldValue,
  SettingSheetFormValues,
  SettingSheetGroupItemValue,
} from '../helpers/form-state';
import { alignGroupItems, groupItemSignature } from './item-align';
import { flattenMergeRows, type MergeFieldNode, type MergeGroupItemNode, type MergeGroupNode, type MergeNode } from './merge-tree';
import { isSameValues, itemSlotKey, joinKey, type MergeRow, type MergeSide } from './merge-types';

const EMPTY_FIELD_VALUE: SettingSheetFieldValue = { values: [], items: [] };
const EDITABLE_BLOCK_TYPES = new Set(['SHORT_TEXT', 'LONG_TEXT']);

type ScopedAnswers = Record<string, SettingSheetFieldValue>;

interface Scope {
  base: ScopedAnswers;
  mine: ScopedAnswers;
  theirs: ScopedAnswers;
  keyPrefix: string;
  labelPath: string[];
}

export function buildMergeTree(
  config: SettingSheetConfigResponse,
  base: SettingSheetFormValues,
  mine: SettingSheetFormValues,
  theirs: SettingSheetFormValues,
): MergeNode[] {
  return visitBlocks(config.blocks, {
    base: base.answers,
    mine: mine.answers,
    theirs: theirs.answers,
    keyPrefix: '',
    labelPath: [],
  });
}

export function collectMergeRows(
  config: SettingSheetConfigResponse,
  base: SettingSheetFormValues,
  mine: SettingSheetFormValues,
  theirs: SettingSheetFormValues,
): MergeRow[] {
  return flattenMergeRows(buildMergeTree(config, base, mine, theirs));
}

function visitBlocks(blocks: SettingSheetBlock[], scope: Scope): MergeNode[] {
  const nodes: MergeNode[] = [];

  for (const block of blocks) {
    if (block.hidden) {
      continue;
    }
    if (isSectionBlock(block.type)) {
      nodes.push({
        kind: 'section',
        key: joinKey(scope.keyPrefix, block.id),
        label: block.label,
        children: visitBlocks(block.fields, { ...scope, labelPath: [...scope.labelPath, block.label] }),
      });
      continue;
    }
    if (isRepeatableGroupBlock(block.type)) {
      nodes.push(visitGroup(block, scope));
      continue;
    }
    nodes.push(visitLeaf(block, scope));
  }

  return nodes;
}

function visitLeaf(block: SettingSheetBlock, scope: Scope): MergeFieldNode {
  const base = (scope.base[block.id] ?? EMPTY_FIELD_VALUE).values;
  const mine = (scope.mine[block.id] ?? EMPTY_FIELD_VALUE).values;
  const theirs = (scope.theirs[block.id] ?? EMPTY_FIELD_VALUE).values;
  const key = joinKey(scope.keyPrefix, block.id);

  if (isSameValues(mine, theirs)) {
    return { kind: 'field', key, label: block.label, row: null, mine, theirs };
  }

  const editable = EDITABLE_BLOCK_TYPES.has(block.type) && mine.length <= 1 && theirs.length <= 1;
  return {
    kind: 'field',
    key,
    label: block.label,
    mine,
    theirs,
    row: {
      key,
      label: [...scope.labelPath, block.label].join(' › '),
      kind: 'value',
      changedBy: resolveChangedBy(isSameValues(mine, base), isSameValues(theirs, base)),
      base,
      mine,
      theirs,
      editable,
      multiline: block.type === 'LONG_TEXT',
    },
  };
}

function visitGroup(block: SettingSheetBlock, scope: Scope): MergeGroupNode {
  const baseItems = (scope.base[block.id] ?? EMPTY_FIELD_VALUE).items;
  const mineItems = (scope.mine[block.id] ?? EMPTY_FIELD_VALUE).items;
  const theirsItems = (scope.theirs[block.id] ?? EMPTY_FIELD_VALUE).items;

  const items = alignGroupItems(baseItems, mineItems, theirsItems).map((slot, slotIndex) => {
    const key = itemSlotKey(scope.keyPrefix, block.id, slotIndex);
    const label = groupItemLabel(block, slotIndex);
    const baseItem = slot.baseIndex === null ? null : baseItems[slot.baseIndex];
    const mineItem = slot.mineIndex === null ? null : mineItems[slot.mineIndex];
    const theirsItem = slot.theirsIndex === null ? null : theirsItems[slot.theirsIndex];

    const row = buildSlotRow(block, key, [...scope.labelPath, label].join(' › '), baseItem, mineItem, theirsItem);
    const node: MergeGroupItemNode = {
      key,
      label,
      row,
      mineSummary: mineItem ? summarizeGroupItem(block, mineItem) : null,
      theirsSummary: theirsItem ? summarizeGroupItem(block, theirsItem) : null,
      children: [],
    };

    if (!row && mineItem && theirsItem) {
      node.children = visitBlocks(getGroupItemFields(block, mineItem.variantId), {
        base: baseItem?.answers ?? {},
        mine: mineItem.answers,
        theirs: theirsItem.answers,
        keyPrefix: key,
        labelPath: [...scope.labelPath, label],
      });
    }

    return node;
  });

  return { kind: 'group', key: joinKey(scope.keyPrefix, block.id), label: block.label, items };
}

/**
 * 項目まるごとの差分（追加・削除・種類変更）を 1 行にする。
 * 中身の差分に降りるべき場合は null を返す。
 */
function buildSlotRow(
  block: SettingSheetBlock,
  key: string,
  label: string,
  baseItem: SettingSheetGroupItemValue | null,
  mineItem: SettingSheetGroupItemValue | null,
  theirsItem: SettingSheetGroupItemValue | null,
): MergeRow | null {
  if (!mineItem && !theirsItem) {
    return null;
  }

  const summary = {
    mine: mineItem ? summarizeGroupItem(block, mineItem) : undefined,
    theirs: theirsItem ? summarizeGroupItem(block, theirsItem) : undefined,
  };
  const common = {
    key,
    label,
    itemSummary: summary,
    editable: false,
    multiline: false,
    mine: mineItem ? [summary.mine ?? ''] : null,
    theirs: theirsItem ? [summary.theirs ?? ''] : null,
  };

  if (!baseItem) {
    if (mineItem && theirsItem) {
      // 双方が同じ内容を追加した。差分ではない
      return null;
    }
    const side: MergeSide = mineItem ? 'mine' : 'theirs';
    return { ...common, kind: 'item-added', changedBy: side, base: null };
  }

  if (!mineItem || !theirsItem) {
    const surviving = (mineItem ?? theirsItem)!;
    const survivingChanged = groupItemSignature(surviving) !== groupItemSignature(baseItem);
    return {
      ...common,
      kind: 'item-removed',
      changedBy: survivingChanged ? 'both' : (mineItem ? 'theirs' : 'mine'),
      base: [summarizeGroupItem(block, baseItem)],
    };
  }

  if (mineItem.variantId !== theirsItem.variantId) {
    // 項目の種類自体が違うので、中身の突き合わせはせず項目まるごとを選ばせる
    return {
      ...common,
      kind: 'value',
      changedBy: resolveChangedBy(
        mineItem.variantId === baseItem.variantId,
        theirsItem.variantId === baseItem.variantId,
      ),
      base: [summarizeGroupItem(block, baseItem)],
    };
  }

  return null;
}

function resolveChangedBy(mineUnchanged: boolean, theirsUnchanged: boolean): MergeSide | 'both' {
  if (mineUnchanged) {
    return 'theirs';
  }
  if (theirsUnchanged) {
    return 'mine';
  }
  return 'both';
}

export function groupItemLabel(block: SettingSheetBlock, slotIndex: number) {
  return `${block.entryTitle || block.label}${slotIndex + 1}`;
}

/** どの項目についての差分かが分かるよう、曲名やタイトル項目から要約を作る。 */
export function summarizeGroupItem(block: SettingSheetBlock, item: SettingSheetGroupItemValue): string {
  const titleSource = block.titleSourceFieldId
    ? item.answers[block.titleSourceFieldId]?.values.find((value) => value.trim())
    : undefined;
  if (titleSource) {
    return titleSource;
  }

  for (const field of getGroupItemFields(block, item.variantId)) {
    const value = item.answers[field.id];
    if (!value) {
      continue;
    }
    if (isSongBlock(field.type)) {
      const parts = value.values.filter((entry) => entry.trim());
      if (parts.length > 0) {
        return parts.join(' / ');
      }
      continue;
    }
    const first = value.values.find((entry) => entry.trim());
    if (first) {
      return first;
    }
  }

  return '(空の項目)';
}
