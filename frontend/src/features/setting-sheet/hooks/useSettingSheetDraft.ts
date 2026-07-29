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

// Safari のプライベートブラウズなど、localStorage が使えない環境では例外が飛ぶ。
// 下書きは補助機能なので、失敗しても入力自体は続けられるように握りつぶす。
function readRaw(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeRaw(storageKey: string, value: string) {
  try {
    window.localStorage.setItem(storageKey, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // 消せなくても画面側の状態は戻すので、ここでは何もしない
  }
}

/** フォーム state の初期化に使うため、フック化せず素の関数として提供する。 */
export function readSettingSheetDraft(storageKey: string, blocks: SettingSheetBlock[]) {
  const raw = readRaw(storageKey);
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
      if (writeRaw(storageKey, JSON.stringify({ savedAt: nextSavedAt, values: formValues }))) {
        setDraftSavedAt(nextSavedAt);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [formValues, storageKey]);

  const clearDraft = () => {
    removeRaw(storageKey);
    setDraftSavedAt(null);
  };

  return { draftSavedAt, clearDraft };
}
