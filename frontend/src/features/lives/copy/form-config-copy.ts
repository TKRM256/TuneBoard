/**
 * 他ライブのフォーム設定を、いま編集中の設定へ取り込むための計画を組み立てる。
 * 取り込み単位はトップレベルのブロック（子項目やバリアントは丸ごと付いてくる）と、
 * タイトルなどのフォーム全体の設定。
 */
import {
  SETTING_SHEET_BLOCK_OPTIONS,
  canContainBlocks,
  normalizeSettingSheetConfig,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '../types/live-types';

/** new=現在のフォームに無い / overwrite=同じIDのブロックを置き換え / conflict=入れ子側とID衝突 */
export type FormBlockCopyStatus = 'new' | 'overwrite' | 'conflict';

export interface FormBlockCopyEntry {
  blockId: string;
  label: string;
  typeLabel: string;
  status: FormBlockCopyStatus;
  /** 一緒に取り込まれる子項目のラベル。 */
  childLabels: string[];
  selectable: boolean;
}

export type FormMetaKey = 'title' | 'description' | 'submitButtonLabel' | 'publicSubmissionEnabled';

export interface FormMetaCopyEntry {
  key: FormMetaKey;
  label: string;
  currentValue: string;
  sourceValue: string;
  changed: boolean;
}

export interface FormConfigCopyPlan {
  blocks: FormBlockCopyEntry[];
  meta: FormMetaCopyEntry[];
}

const META_LABELS: Record<FormMetaKey, string> = {
  title: 'フォームタイトル',
  description: 'フォーム説明',
  submitButtonLabel: '送信ボタン文言',
  publicSubmissionEnabled: '提出済み一覧の公開',
};

export function buildFormConfigCopyPlan(
  current: SettingSheetConfigResponse,
  source: SettingSheetConfigResponse,
): FormConfigCopyPlan {
  const topLevelIds = new Set(current.blocks.map((block) => block.id));
  const allIds = collectBlockIds(current.blocks);

  const blocks = source.blocks.map<FormBlockCopyEntry>((block) => {
    const status: FormBlockCopyStatus = topLevelIds.has(block.id)
      ? 'overwrite'
      : allIds.has(block.id)
        ? 'conflict'
        : 'new';
    return {
      blockId: block.id,
      label: block.label,
      typeLabel: blockTypeLabel(block),
      status,
      childLabels: collectChildLabels(block),
      selectable: status !== 'conflict',
    };
  });

  const meta: FormMetaCopyEntry[] = (Object.keys(META_LABELS) as FormMetaKey[]).map((key) => {
    const currentValue = metaValueText(current, key);
    const sourceValue = metaValueText(source, key);
    return { key, label: META_LABELS[key], currentValue, sourceValue, changed: currentValue !== sourceValue };
  });

  return { blocks, meta };
}

/** 既定では取り込めるブロックをすべて選択しておく。 */
export function defaultSelectedBlockIds(plan: FormConfigCopyPlan): Set<string> {
  return new Set(plan.blocks.filter((entry) => entry.selectable).map((entry) => entry.blockId));
}

export function applyFormConfigCopy(
  current: SettingSheetConfigResponse,
  source: SettingSheetConfigResponse,
  selectedBlockIds: Set<string>,
  selectedMetaKeys: Set<FormMetaKey>,
): SettingSheetConfigResponse {
  const picked = source.blocks.filter((block) => selectedBlockIds.has(block.id));
  const pickedById = new Map(picked.map((block) => [block.id, block]));
  const currentTopLevelIds = new Set(current.blocks.map((block) => block.id));

  const replaced = current.blocks.map((block) => {
    const incoming = pickedById.get(block.id);
    return incoming ? cloneBlock(incoming) : block;
  });
  const appended = picked.filter((block) => !currentTopLevelIds.has(block.id)).map(cloneBlock);

  return normalizeSettingSheetConfig({
    title: selectedMetaKeys.has('title') ? source.title : current.title,
    description: selectedMetaKeys.has('description') ? source.description : current.description,
    submitButtonLabel: selectedMetaKeys.has('submitButtonLabel') ? source.submitButtonLabel : current.submitButtonLabel,
    publicSubmissionEnabled: selectedMetaKeys.has('publicSubmissionEnabled')
      ? source.publicSubmissionEnabled
      : current.publicSubmissionEnabled,
    blocks: [...replaced, ...appended],
  });
}

function metaValueText(config: SettingSheetConfigResponse, key: FormMetaKey): string {
  if (key === 'publicSubmissionEnabled') {
    return config.publicSubmissionEnabled ? '公開する' : '公開しない';
  }
  return config[key] ?? '';
}

function blockTypeLabel(block: SettingSheetBlock): string {
  return SETTING_SHEET_BLOCK_OPTIONS.find((option) => option.value === block.type)?.label ?? block.type;
}

function collectChildLabels(block: SettingSheetBlock): string[] {
  if (!canContainBlocks(block.type)) {
    return [];
  }
  const variantFields = (block.variants ?? []).flatMap((variant) => variant.fields);
  return [...block.fields, ...variantFields].map((field) => field.label);
}

function collectBlockIds(blocks: SettingSheetBlock[]): Set<string> {
  const ids = new Set<string>();
  const visit = (targets: SettingSheetBlock[]) => {
    for (const block of targets) {
      ids.add(block.id);
      visit(block.fields ?? []);
      for (const variant of block.variants ?? []) {
        visit(variant.fields ?? []);
      }
    }
  };
  visit(blocks);
  return ids;
}

function cloneBlock(block: SettingSheetBlock): SettingSheetBlock {
  return JSON.parse(JSON.stringify(block)) as SettingSheetBlock;
}
