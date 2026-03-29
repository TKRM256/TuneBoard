import {
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetSubmissionAnswerResponse,
} from '@/features/lives/types/live-types';

export interface SettingSheetGroupItemValue {
  id: string;
  answers: Record<string, SettingSheetFieldValue>;
}

export interface SettingSheetFieldValue {
  values: string[];
  items: SettingSheetGroupItemValue[];
}

export interface SettingSheetFormValues {
  answers: Record<string, SettingSheetFieldValue>;
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
    return {
      values: [],
      items: Array.from({ length: minItems }, () => createGroupItemValue(block.fields)),
    };
  }

  return { values: [], items: [] };
}

export function createGroupItemValue(blocks: SettingSheetBlock[]): SettingSheetGroupItemValue {
  return {
    id: createId(),
    answers: createScopedAnswers(blocks),
  };
}

export function cloneGroupItemValue(blocks: SettingSheetBlock[], item: SettingSheetGroupItemValue): SettingSheetGroupItemValue {
  return {
    id: createId(),
    answers: cloneScopedAnswers(blocks, item.answers),
  };
}

export function createDefaultSettingSheetValues(blocks: SettingSheetBlock[]): SettingSheetFormValues {
  return { answers: createScopedAnswers(blocks) };
}

export function createSettingSheetValuesFromSubmissionAnswers(
  blocks: SettingSheetBlock[],
  answers: SettingSheetSubmissionAnswerResponse[],
): SettingSheetFormValues {
  const answerMap = new Map(answers.map((answer) => [answer.fieldId, answer]));
  return { answers: buildScopedAnswersFromSubmissionAnswers(blocks, answerMap) };
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

    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
      values: { answers: normalizeValuesForBlocks(blocks, answers) },
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
    const items = answer.items.map((item) => createGroupItemFromSubmissionAnswers(block.fields, item.answers));
    return { values: [], items: items.length > 0 ? items : fallback.items };
  }
  return { values: normalizeScalarValues(answer.values), items: [] };
}

function createGroupItemFromSubmissionAnswers(
  blocks: SettingSheetBlock[],
  answers: SettingSheetSubmissionAnswerResponse[],
): SettingSheetGroupItemValue {
  const answerMap = new Map(answers.map((answer) => [answer.fieldId, answer]));
  return { id: createId(), answers: buildScopedAnswersFromSubmissionAnswers(blocks, answerMap) };
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
        items: current.items.map((child) => ({ id: createId(), answers: cloneScopedAnswers(block.fields, child.answers) })),
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
    const items = rawItems.map((item) => normalizeGroupItemValue(block.fields, item));
    return { values: [], items: items.length > 0 ? items : fallback.items };
  }

  return { values: normalizeScalarValues(rawValue.values), items: [] };
}

function normalizeGroupItemValue(blocks: SettingSheetBlock[], candidate: unknown): SettingSheetGroupItemValue {
  const rawItem = candidate && typeof candidate === 'object' ? candidate as Partial<SettingSheetGroupItemValue> : {};
  const rawAnswers = rawItem.answers && typeof rawItem.answers === 'object' ? rawItem.answers as Record<string, unknown> : {};
  return {
    id: typeof rawItem.id === 'string' && rawItem.id.trim() ? rawItem.id : createId(),
    answers: normalizeValuesForBlocks(blocks, rawAnswers),
  };
}

function normalizeScalarValues(candidate: unknown) {
  return Array.isArray(candidate) ? candidate.map((value) => String(value).trim()).filter(Boolean) : [];
}