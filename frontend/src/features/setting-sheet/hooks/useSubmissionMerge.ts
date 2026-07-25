/** 提出済みシートの更新が競合したときのマージ状態を保持する */
import { useState } from 'react';

import type {
  PublicSettingSheetSubmissionDetailResponse,
  SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import { createSettingSheetValuesFromSubmissionAnswers, type SettingSheetFormValues } from '../types';
import { applyMergeSelections } from '../merge/merge-apply';
import { buildMergeTree } from '../merge/merge-diff';
import { flattenMergeRows, type MergeNode } from '../merge/merge-tree';
import {
  buildDefaultSelections,
  countUnresolved,
  type MergeChoice,
  type MergeRow,
  type MergeSelections,
} from '../merge/merge-types';

interface ConflictState {
  /** 自分の編集の出発点になったサーバの状態 */
  base: SettingSheetFormValues;
  mine: SettingSheetFormValues;
  theirs: SettingSheetFormValues;
  latestVersion: number;
  /** 元のフォームと同じ並びの比較ツリー。マージ画面はこれを描画する。 */
  nodes: MergeNode[];
  rows: MergeRow[];
}

export function useSubmissionMerge(settingSheetConfig: SettingSheetConfigResponse) {
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [selections, setSelections] = useState<MergeSelections>({});

  const openConflict = (
    latest: PublicSettingSheetSubmissionDetailResponse,
    base: SettingSheetFormValues,
    mine: SettingSheetFormValues,
  ) => {
    const theirs = createSettingSheetValuesFromSubmissionAnswers(
      settingSheetConfig.blocks,
      latest.answers,
      latest.itunesLinks,
    );
    const nodes = buildMergeTree(settingSheetConfig, base, mine, theirs);
    const rows = flattenMergeRows(nodes);

    setConflict({ base, mine, theirs, latestVersion: latest.version, nodes, rows });
    setSelections(buildDefaultSelections(rows));
  };

  const closeConflict = () => {
    setConflict(null);
    setSelections({});
  };

  const select = (key: string, choice: MergeChoice) => {
    setSelections((current) => ({ ...current, [key]: choice }));
  };

  const buildMergedValues = () => {
    if (!conflict) {
      return null;
    }
    return applyMergeSelections(
      settingSheetConfig,
      conflict.base,
      conflict.mine,
      conflict.theirs,
      conflict.rows,
      selections,
    );
  };

  return {
    conflict,
    nodes: conflict?.nodes ?? [],
    rows: conflict?.rows ?? [],
    selections,
    unresolvedCount: conflict ? countUnresolved(conflict.rows, selections) : 0,
    openConflict,
    closeConflict,
    select,
    buildMergedValues,
  };
}
