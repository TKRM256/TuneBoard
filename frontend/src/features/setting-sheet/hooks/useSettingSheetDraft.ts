/** 公開フォームの下書きを localStorage に自動保存する */
import { useEffect, useState } from 'react';

import type { SettingSheetBlock } from '@/features/lives/types/live-types';

import { parseSettingSheetDraft, type SettingSheetFormValues } from '../types';

const AUTOSAVE_DELAY_MS = 400;

export function buildDraftStorageKey(publicToken: string, submissionId?: string) {
  return submissionId
    ? `tuneboard:setting-sheet:${publicToken}:submission:${submissionId}`
    : `tuneboard:setting-sheet:${publicToken}`;
}

/** フォーム state の初期化に使うため、フック化せず素の関数として提供する。 */
export function readSettingSheetDraft(storageKey: string, blocks: SettingSheetBlock[]) {
  const raw = window.localStorage.getItem(storageKey);
  return raw ? parseSettingSheetDraft(raw, blocks) : null;
}

interface UseSettingSheetDraftParams {
  storageKey: string;
  formValues: SettingSheetFormValues;
  initialSavedAt: string | null;
}

export function useSettingSheetDraft({ storageKey, formValues, initialSavedAt }: UseSettingSheetDraftParams) {
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(initialSavedAt);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSavedAt = new Date().toISOString();
      window.localStorage.setItem(storageKey, JSON.stringify({ savedAt: nextSavedAt, values: formValues }));
      setDraftSavedAt(nextSavedAt);
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [formValues, storageKey]);

  const clearDraft = () => {
    window.localStorage.removeItem(storageKey);
    setDraftSavedAt(null);
  };

  return { draftSavedAt, clearDraft };
}
