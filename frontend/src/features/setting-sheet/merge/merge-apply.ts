/** マージ画面での選択結果から、確定後のフォーム値を組み立てる */
import {
  getGroupItemFields,
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import {
  matchItunesLinksToGroupItems,
  type SettingSheetFieldValue,
  type SettingSheetFormValues,
  type SettingSheetGroupItemValue,
} from '../helpers/form-state';
import { alignGroupItems } from './item-align';
import { itemSlotKey, joinKey, type MergeRow, type MergeSelections, type MergeSide } from './merge-types';

const EMPTY_FIELD_VALUE: SettingSheetFieldValue = { values: [], items: [] };

type ScopedAnswers = Record<string, SettingSheetFieldValue>;

/** 差分収集時とまったく同じ走査・同じキーを再現するため、base も一緒に持ち回る */
interface ApplyScope {
  base: ScopedAnswers;
  mine: ScopedAnswers;
  theirs: ScopedAnswers;
  keyPrefix: string;
}

interface ApplyContext {
  rows: Map<string, MergeRow>;
  selections: MergeSelections;
}

export function applyMergeSelections(
  config: SettingSheetConfigResponse,
  base: SettingSheetFormValues,
  mine: SettingSheetFormValues,
  theirs: SettingSheetFormValues,
  rows: MergeRow[],
  selections: MergeSelections,
): SettingSheetFormValues {
  const context: ApplyContext = {
    rows: new Map(rows.map((row) => [row.key, row])),
    selections,
  };

  const answers = buildScope(config.blocks, {
    base: base.answers,
    mine: mine.answers,
    theirs: theirs.answers,
    keyPrefix: '',
  }, context);

  // 曲名とアーティスト名で突き合わせ直すことで、どちら側を採用しても iTunes リンクが追従する
  const linkPool = [...Object.values(mine.itunesLinks ?? {}), ...Object.values(theirs.itunesLinks ?? {})];
  return {
    answers,
    itunesLinks: matchItunesLinksToGroupItems(config.blocks, answers, linkPool),
  };
}

function buildScope(blocks: SettingSheetBlock[], scope: ApplyScope, context: ApplyContext): ScopedAnswers {
  const entries: Array<[string, SettingSheetFieldValue]> = [];

  for (const block of blocks) {
    if (isSectionBlock(block.type)) {
      entries.push([block.id, cloneFieldValue(scope.mine[block.id] ?? EMPTY_FIELD_VALUE)]);
      entries.push(...Object.entries(buildScope(block.fields, scope, context)));
      continue;
    }
    // hidden なブロックは差分の対象外なので、自分の値をそのまま残す
    if (block.hidden) {
      entries.push([block.id, cloneFieldValue(scope.mine[block.id] ?? EMPTY_FIELD_VALUE)]);
      continue;
    }
    if (isRepeatableGroupBlock(block.type)) {
      entries.push([block.id, buildGroupValue(block, scope, context)]);
      continue;
    }
    entries.push([block.id, buildLeafValue(block, scope, context)]);
  }

  return Object.fromEntries(entries);
}

function buildLeafValue(block: SettingSheetBlock, scope: ApplyScope, context: ApplyContext): SettingSheetFieldValue {
  const key = joinKey(scope.keyPrefix, block.id);
  const choice = context.selections[key];

  if (choice?.kind === 'text') {
    return { values: choice.value ? [choice.value] : [], items: [] };
  }

  const side = resolveSide(key, choice?.kind === 'side' ? choice.side : undefined, context);
  const source = side === 'theirs' ? scope.theirs[block.id] : scope.mine[block.id];
  return cloneFieldValue(source ?? EMPTY_FIELD_VALUE);
}

function buildGroupValue(block: SettingSheetBlock, scope: ApplyScope, context: ApplyContext): SettingSheetFieldValue {
  const baseItems = (scope.base[block.id] ?? EMPTY_FIELD_VALUE).items;
  const mineItems = (scope.mine[block.id] ?? EMPTY_FIELD_VALUE).items;
  const theirsItems = (scope.theirs[block.id] ?? EMPTY_FIELD_VALUE).items;
  const slots = alignGroupItems(baseItems, mineItems, theirsItems);

  const items: SettingSheetGroupItemValue[] = [];

  slots.forEach((slot, slotIndex) => {
    const key = itemSlotKey(scope.keyPrefix, block.id, slotIndex);
    const baseItem = slot.baseIndex === null ? null : baseItems[slot.baseIndex];
    const mineItem = slot.mineIndex === null ? null : mineItems[slot.mineIndex];
    const theirsItem = slot.theirsIndex === null ? null : theirsItems[slot.theirsIndex];

    if (context.rows.has(key)) {
      // 項目まるごとの差分。選ばれた側にその項目が無ければ削除される
      const choice = context.selections[key];
      const side = resolveSide(key, choice?.kind === 'side' ? choice.side : undefined, context);
      const chosen = side === 'theirs' ? theirsItem : mineItem;
      if (chosen) {
        items.push(cloneGroupItem(chosen));
      }
      return;
    }

    if (mineItem && theirsItem) {
      items.push({
        id: mineItem.id,
        variantId: mineItem.variantId,
        answers: buildScope(getGroupItemFields(block, mineItem.variantId), {
          base: baseItem?.answers ?? {},
          mine: mineItem.answers,
          theirs: theirsItem.answers,
          keyPrefix: key,
        }, context),
      });
      return;
    }

    const remaining = mineItem ?? theirsItem;
    if (remaining) {
      items.push(cloneGroupItem(remaining));
    }
  });

  return { values: [], items };
}

function resolveSide(key: string, explicit: MergeSide | undefined, context: ApplyContext): MergeSide {
  if (explicit) {
    return explicit;
  }
  const row = context.rows.get(key);
  if (row && row.changedBy !== 'both') {
    return row.changedBy;
  }
  return 'mine';
}

function cloneFieldValue(value: SettingSheetFieldValue): SettingSheetFieldValue {
  return {
    values: [...value.values],
    items: value.items.map(cloneGroupItem),
  };
}

function cloneGroupItem(item: SettingSheetGroupItemValue): SettingSheetGroupItemValue {
  return {
    id: item.id,
    variantId: item.variantId,
    answers: Object.fromEntries(
      Object.entries(item.answers).map(([key, value]) => [key, cloneFieldValue(value)]),
    ),
  };
}
