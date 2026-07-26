/**
 * 前回のセッティングシートの入力値を、いま開いているフォームへ取り込む計画を組み立てる。
 * フォームはライブごとに違うので、項目は ID が一致するもの、無ければ同じラベル＋同じ種類の
 * ものを突き合わせる。選択肢が消えている値のように、そのままでは使えない値は落として報告する。
 */
import {
  SETTING_SHEET_BLOCK_OPTIONS,
  getGroupItemFields,
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import {
  createGroupItemValue,
  createSettingSheetFieldValue,
  matchItunesLinksToGroupItems,
  type SettingSheetFieldValue,
  type SettingSheetFormValues,
  type SettingSheetGroupItemValue,
} from '../helpers/form-state';
import { summarizeGroupItem } from '../merge/merge-diff';

export interface ValueCopyRow {
  /** 取り込み先ブロックの ID。フォーム値のキーでもある。 */
  key: string;
  label: string;
  typeLabel: string;
  matchedBy: 'id' | 'label';
  currentText: string;
  incomingText: string;
  /** 選択肢に無いなどの理由で落とした値。 */
  droppedValues: string[];
  value: SettingSheetFieldValue;
}

export interface ValueCopyPlan {
  rows: ValueCopyRow[];
  /** 取り込み元に対応する項目が無かった、現在のフォームの項目。 */
  unmatchedLabels: string[];
}

export function buildValueCopyPlan(
  currentConfig: SettingSheetConfigResponse,
  currentValues: SettingSheetFormValues,
  sourceConfig: SettingSheetConfigResponse,
  sourceValues: SettingSheetFormValues,
): ValueCopyPlan {
  const sourceLookup = createLookup(flattenBlocks(sourceConfig.blocks));
  const rows: ValueCopyRow[] = [];
  const unmatchedLabels: string[] = [];

  for (const block of flattenBlocks(currentConfig.blocks)) {
    const match = findMatch(block, sourceLookup);
    if (!match) {
      unmatchedLabels.push(block.label);
      continue;
    }

    const sourceValue = sourceValues.answers[match.block.id];
    const mapped = mapFieldValue(block, match.block, sourceValue);
    const incomingText = describeValue(block, mapped.value);
    if (!incomingText) {
      unmatchedLabels.push(block.label);
      continue;
    }

    rows.push({
      key: block.id,
      label: block.label,
      typeLabel: blockTypeLabel(block),
      matchedBy: match.matchedBy,
      currentText: describeValue(block, currentValues.answers[block.id]),
      incomingText,
      droppedValues: mapped.dropped,
      value: mapped.value,
    });
  }

  return { rows, unmatchedLabels };
}

export function applyValueCopy(
  currentConfig: SettingSheetConfigResponse,
  currentValues: SettingSheetFormValues,
  rows: ValueCopyRow[],
  selectedKeys: Set<string>,
  sourceItunesLinks: SettingSheetFormValues['itunesLinks'],
): SettingSheetFormValues {
  const answers = { ...currentValues.answers };
  for (const row of rows) {
    if (selectedKeys.has(row.key)) {
      answers[row.key] = row.value;
    }
  }

  // 曲の紐付けは項目 ID ではなく曲名・アーティスト名で持っているため、
  // 取り込み後の値に対して改めて突き合わせ直す。
  const matchedLinks = matchItunesLinksToGroupItems(
    currentConfig.blocks,
    answers,
    Object.values(sourceItunesLinks ?? {}),
  );

  return { answers, itunesLinks: { ...currentValues.itunesLinks, ...matchedLinks } };
}

interface BlockLookup {
  byId: Map<string, SettingSheetBlock>;
  byLabel: Map<string, SettingSheetBlock[]>;
}

function createLookup(blocks: SettingSheetBlock[]): BlockLookup {
  const byId = new Map<string, SettingSheetBlock>();
  const byLabel = new Map<string, SettingSheetBlock[]>();
  for (const block of blocks) {
    byId.set(block.id, block);
    const key = labelKey(block);
    byLabel.set(key, [...(byLabel.get(key) ?? []), block]);
  }
  return { byId, byLabel };
}

function findMatch(
  block: SettingSheetBlock,
  lookup: BlockLookup,
): { block: SettingSheetBlock; matchedBy: 'id' | 'label' } | null {
  const byId = lookup.byId.get(block.id);
  if (byId && byId.type === block.type) {
    return { block: byId, matchedBy: 'id' };
  }

  const candidates = lookup.byLabel.get(labelKey(block)) ?? [];
  return candidates.length === 1 ? { block: candidates[0], matchedBy: 'label' } : null;
}

function labelKey(block: SettingSheetBlock) {
  return `${block.type}::${block.label.trim()}`;
}

/** セクションは値を持たないので中身を平らにし、繰り返しグループは 1 単位として扱う。 */
function flattenBlocks(blocks: SettingSheetBlock[]): SettingSheetBlock[] {
  const flattened: SettingSheetBlock[] = [];
  for (const block of blocks) {
    if (isSectionBlock(block.type)) {
      flattened.push(...flattenBlocks(block.fields ?? []));
      continue;
    }
    flattened.push(block);
  }
  return flattened;
}

function mapFieldValue(
  target: SettingSheetBlock,
  source: SettingSheetBlock,
  sourceValue: SettingSheetFieldValue | undefined,
): { value: SettingSheetFieldValue; dropped: string[] } {
  if (!sourceValue) {
    return { value: createSettingSheetFieldValue(target), dropped: [] };
  }

  if (isRepeatableGroupBlock(target.type)) {
    const dropped: string[] = [];
    const items = sourceValue.items.map((item) => mapGroupItem(target, source, item, dropped));
    return { value: { values: [], items }, dropped };
  }

  const allowed = isOptionBlock(target.type) && !target.optionSource ? new Set(target.options) : null;
  const values = allowed ? sourceValue.values.filter((value) => allowed.has(value)) : [...sourceValue.values];
  const dropped = allowed ? sourceValue.values.filter((value) => !allowed.has(value)) : [];
  return { value: { values, items: [] }, dropped };
}

function mapGroupItem(
  target: SettingSheetBlock,
  source: SettingSheetBlock,
  item: SettingSheetGroupItemValue,
  dropped: string[],
): SettingSheetGroupItemValue {
  const variantId = resolveVariantId(target, source, item.variantId);
  const targetFields = getGroupItemFields(target, variantId);
  const sourceFields = getGroupItemFields(source, item.variantId);
  const created = createGroupItemValue(targetFields, variantId);
  const lookup = createLookup(flattenBlocks(sourceFields));

  for (const field of flattenBlocks(targetFields)) {
    const match = findMatch(field, lookup);
    if (!match) {
      continue;
    }
    const mapped = mapFieldValue(field, match.block, item.answers[match.block.id]);
    created.answers[field.id] = mapped.value;
    dropped.push(...mapped.dropped);
  }

  return created;
}

function resolveVariantId(target: SettingSheetBlock, source: SettingSheetBlock, sourceVariantId: string): string {
  const variants = target.variants ?? [];
  if (variants.length === 0) {
    return '';
  }
  if (variants.some((variant) => variant.id === sourceVariantId)) {
    return sourceVariantId;
  }

  const sourceLabel = (source.variants ?? []).find((variant) => variant.id === sourceVariantId)?.label;
  const byLabel = sourceLabel ? variants.find((variant) => variant.label === sourceLabel) : undefined;
  return (byLabel ?? variants[0]).id;
}

function describeValue(block: SettingSheetBlock, value: SettingSheetFieldValue | undefined): string {
  if (!value) {
    return '';
  }
  if (isRepeatableGroupBlock(block.type)) {
    if (value.items.length === 0) {
      return '';
    }
    const summaries = value.items.map((item) => summarizeGroupItem(block, item));
    return `${value.items.length}件: ${summaries.join(' / ')}`;
  }
  return value.values.filter((entry) => entry.trim()).join(' / ');
}

function blockTypeLabel(block: SettingSheetBlock): string {
  return SETTING_SHEET_BLOCK_OPTIONS.find((option) => option.value === block.type)?.label ?? block.type;
}
