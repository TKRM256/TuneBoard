import {
  isRepeatableGroupBlock,
  isSectionBlock,
  isSongBlock,
  getGroupItemFields,
  type SettingSheetBlock,
  type SettingSheetSubmissionAnswerResponse,
  type ItunesLinkSelection,
} from '@/features/lives/types/live-types';

export interface SettingSheetGroupItemValue {
  id: string;
  variantId: string;
  answers: Record<string, SettingSheetFieldValue>;
}

export interface SettingSheetFieldValue {
  values: string[];
  items: SettingSheetGroupItemValue[];
}

export interface SettingSheetFormValues {
  answers: Record<string, SettingSheetFieldValue>;
  itunesLinks: Record<string, ItunesLinkSelection>;
}

export interface SettingSheetDraft {
  savedAt: string | null;
  values: SettingSheetFormValues;
}

function createId() {
  return crypto.randomUUID();
}

export function createSettingSheetFieldValue(block: SettingSheetBlock): SettingSheetFieldValue {
  if (isRepeatableGroupBlock(block.type)) {
    const minItems = Math.max(block.required ? 1 : 0, block.minItems);
    const variants = block.variants ?? [];
    const defaultVariantId = variants.length > 0 ? variants[0].id : '';
    const defaultFields = getGroupItemFields(block, defaultVariantId);
    return {
      values: [],
      items: Array.from({ length: minItems }, () => createGroupItemValue(defaultFields, defaultVariantId)),
    };
  }

  return { values: [], items: [] };
}

export function createGroupItemValue(blocks: SettingSheetBlock[], variantId = ''): SettingSheetGroupItemValue {
  return {
    id: createId(),
    variantId,
    answers: createScopedAnswers(blocks),
  };
}

export function cloneGroupItemValue(blocks: SettingSheetBlock[], item: SettingSheetGroupItemValue): SettingSheetGroupItemValue {
  return {
    id: createId(),
    variantId: item.variantId,
    answers: cloneScopedAnswers(blocks, item.answers),
  };
}

export function createDefaultSettingSheetValues(blocks: SettingSheetBlock[]): SettingSheetFormValues {
  return { answers: createScopedAnswers(blocks), itunesLinks: {} };
}

export function createSettingSheetValuesFromSubmissionAnswers(
  blocks: SettingSheetBlock[],
  answers: SettingSheetSubmissionAnswerResponse[],
  serverItunesLinks?: ItunesLinkSelection[],
): SettingSheetFormValues {
  const answerMap = new Map(answers.map((answer) => [answer.fieldId, answer]));
  const builtAnswers = buildScopedAnswersFromSubmissionAnswers(blocks, answerMap);
  const itunesLinks = serverItunesLinks?.length
    ? matchItunesLinksToGroupItems(blocks, builtAnswers, serverItunesLinks)
    : {};
  return { answers: builtAnswers, itunesLinks };
}

export function parseSettingSheetDraft(raw: string | null, blocks: SettingSheetBlock[]): SettingSheetDraft {
  const fallback = createDefaultSettingSheetValues(blocks);
  if (!raw) {
    return { savedAt: null, values: fallback };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SettingSheetDraft>;
    const rawValues = typeof parsed.values === 'object' && parsed.values ? parsed.values as Partial<SettingSheetFormValues> : {};
    const answers = typeof rawValues.answers === 'object' && rawValues.answers ? rawValues.answers as Record<string, unknown> : {};

    const itunesLinks = typeof rawValues.itunesLinks === 'object' && rawValues.itunesLinks ? rawValues.itunesLinks as Record<string, ItunesLinkSelection> : {};

    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
      values: { answers: normalizeValuesForBlocks(blocks, answers), itunesLinks },
    };
  } catch {
    return { savedAt: null, values: fallback };
  }
}

export function normalizeValuesForBlocks(
  blocks: SettingSheetBlock[],
  answers: Record<string, unknown>,
): Record<string, SettingSheetFieldValue> {
  const entries: Array<[string, SettingSheetFieldValue]> = [];

  for (const block of blocks) {
    entries.push([block.id, normalizeFieldValue(block, answers[block.id])]);
    if (isSectionBlock(block.type)) {
      entries.push(...Object.entries(normalizeValuesForBlocks(block.fields, answers)));
    }
  }

  return Object.fromEntries(entries) as Record<string, SettingSheetFieldValue>;
}

function createScopedAnswers(blocks: SettingSheetBlock[]): Record<string, SettingSheetFieldValue> {
  const entries: Array<[string, SettingSheetFieldValue]> = [];

  for (const block of blocks) {
    entries.push([block.id, createSettingSheetFieldValue(block)]);
    if (isSectionBlock(block.type)) {
      entries.push(...Object.entries(createScopedAnswers(block.fields)));
    }
  }

  return Object.fromEntries(entries) as Record<string, SettingSheetFieldValue>;
}

function buildScopedAnswersFromSubmissionAnswers(
  blocks: SettingSheetBlock[],
  answerMap: Map<string, SettingSheetSubmissionAnswerResponse>,
): Record<string, SettingSheetFieldValue> {
  const entries: Array<[string, SettingSheetFieldValue]> = [];

  for (const block of blocks) {
    entries.push([block.id, createFieldValueFromSubmissionAnswer(block, answerMap.get(block.id))]);
    if (isSectionBlock(block.type)) {
      entries.push(...Object.entries(buildScopedAnswersFromSubmissionAnswers(block.fields, answerMap)));
    }
  }

  return Object.fromEntries(entries) as Record<string, SettingSheetFieldValue>;
}

function createFieldValueFromSubmissionAnswer(
  block: SettingSheetBlock,
  answer: SettingSheetSubmissionAnswerResponse | undefined,
): SettingSheetFieldValue {
  const fallback = createSettingSheetFieldValue(block);
  if (!answer) {
    return fallback;
  }
  if (isRepeatableGroupBlock(block.type)) {
    const items = answer.items.map((item) => {
      const variantId = item.variantId ?? '';
      const fields = getGroupItemFields(block, variantId);
      return createGroupItemFromSubmissionAnswers(fields, item.answers, variantId);
    });
    return { values: [], items: items.length > 0 ? items : fallback.items };
  }
  return { values: normalizeScalarValues(answer.values), items: [] };
}

function createGroupItemFromSubmissionAnswers(
  blocks: SettingSheetBlock[],
  answers: SettingSheetSubmissionAnswerResponse[],
  variantId = '',
): SettingSheetGroupItemValue {
  const answerMap = new Map(answers.map((answer) => [answer.fieldId, answer]));
  return { id: createId(), variantId, answers: buildScopedAnswersFromSubmissionAnswers(blocks, answerMap) };
}

function cloneScopedAnswers(
  blocks: SettingSheetBlock[],
  answers: Record<string, SettingSheetFieldValue>,
): Record<string, SettingSheetFieldValue> {
  const entries: Array<[string, SettingSheetFieldValue]> = [];

  for (const block of blocks) {
    const current = answers[block.id] ?? createSettingSheetFieldValue(block);
    if (isRepeatableGroupBlock(block.type)) {
      entries.push([block.id, {
        values: [],
        items: current.items.map((child) => ({
          id: createId(),
          variantId: child.variantId,
          answers: cloneScopedAnswers(getGroupItemFields(block, child.variantId), child.answers),
        })),
      }]);
      continue;
    }

    entries.push([block.id, { values: [...current.values], items: [] }]);
    if (isSectionBlock(block.type)) {
      entries.push(...Object.entries(cloneScopedAnswers(block.fields, answers)));
    }
  }

  return Object.fromEntries(entries) as Record<string, SettingSheetFieldValue>;
}

function normalizeFieldValue(block: SettingSheetBlock, candidate: unknown): SettingSheetFieldValue {
  const fallback = createSettingSheetFieldValue(block);
  if (!candidate || typeof candidate !== 'object') {
    return fallback;
  }

  const rawValue = candidate as Partial<SettingSheetFieldValue>;
  if (isRepeatableGroupBlock(block.type)) {
    const rawItems = Array.isArray(rawValue.items) ? rawValue.items : [];
    const items = rawItems.map((item) => {
      const rawItem = item && typeof item === 'object' ? item as Partial<SettingSheetGroupItemValue> : {};
      const variantId = typeof rawItem.variantId === 'string' ? rawItem.variantId : '';
      return normalizeGroupItemValue(getGroupItemFields(block, variantId), item);
    });
    return { values: [], items: items.length > 0 ? items : fallback.items };
  }

  return { values: normalizeScalarValues(rawValue.values), items: [] };
}

function normalizeGroupItemValue(blocks: SettingSheetBlock[], candidate: unknown): SettingSheetGroupItemValue {
  const rawItem = candidate && typeof candidate === 'object' ? candidate as Partial<SettingSheetGroupItemValue> : {};
  const rawAnswers = rawItem.answers && typeof rawItem.answers === 'object' ? rawItem.answers as Record<string, unknown> : {};
  return {
    id: typeof rawItem.id === 'string' && rawItem.id.trim() ? rawItem.id : createId(),
    variantId: typeof rawItem.variantId === 'string' ? rawItem.variantId : '',
    answers: normalizeValuesForBlocks(blocks, rawAnswers),
  };
}

function normalizeScalarValues(candidate: unknown) {
  return Array.isArray(candidate) ? candidate.map((value) => String(value).trim()).filter(Boolean) : [];
}

function matchItunesLinksToGroupItems(
  blocks: SettingSheetBlock[],
  answers: Record<string, SettingSheetFieldValue>,
  serverLinks: ItunesLinkSelection[],
): Record<string, ItunesLinkSelection> {
  const result: Record<string, ItunesLinkSelection> = {};
  const remaining = [...serverLinks];

  const visit = (currentBlocks: SettingSheetBlock[], currentAnswers: Record<string, SettingSheetFieldValue>) => {
    for (const block of currentBlocks) {
      if (isSectionBlock(block.type)) {
        visit(block.fields, currentAnswers);
        continue;
      }
      if (!isRepeatableGroupBlock(block.type)) continue;

      const fieldValue = currentAnswers[block.id];
      if (!fieldValue) continue;

      for (const item of fieldValue.items) {
        const itemFields = getGroupItemFields(block, item.variantId);
        for (const child of itemFields) {
          if (!isSongBlock(child.type)) continue;
          const songValue = item.answers[child.id];
          if (!songValue) continue;
          const title = (songValue.values[0] ?? '').trim().toLowerCase();
          const artist = (songValue.values[1] ?? '').trim().toLowerCase();
          if (!title) continue;

          const idx = remaining.findIndex(
            (link) => link.songTitle.trim().toLowerCase() === title && link.songArtist.trim().toLowerCase() === artist,
          );
          if (idx >= 0) {
            result[item.id] = remaining[idx];
            remaining.splice(idx, 1);
          }
        }
      }
    }
  };

  visit(blocks, answers);
  return result;
}