import { useMemo, useRef, useState } from 'react';
import { toast  } from 'sonner';

import {
  getPublicSubmissionStatusMessage,
  isPublicSubmissionClosed,
  normalizeSettingSheetConfig,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetSubmissionResponse,
} from '@/features/lives/types/live-types';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';

import {
  createDefaultSettingSheetValues,
  createSettingSheetValuesFromSubmissionAnswers,
  fieldIdFromKey,
  pruneUnknownOptionValues,
  toSettingSheetSubmissionPayload,
  validateSettingSheetForm,
  type SettingSheetFieldValue,
  type SettingSheetFormValues,
  type SettingSheetIssue,
} from '../types';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useSubmissionMerge } from './useSubmissionMerge';
import { buildDraftStorageKey, readSettingSheetDraft, useSettingSheetDraft } from './useSettingSheetDraft';
import { resolveIssueLabel } from '../helpers/issue-labels';
import { parseSubmissionConflict } from '../merge/conflict-error';

interface UseSettingSheetFormParams {
  publicToken: string;
  live: PublicLiveResponse;
  submission: PublicSettingSheetSubmissionDetailResponse | null;
  onSubmitted: (submissionId: string) => void;
}

export function useSettingSheetForm({ publicToken, live, submission, onSubmitted }: UseSettingSheetFormParams) {
  const settingSheetConfig = useMemo(
    () => normalizeSettingSheetConfig(live.settingSheetConfig),
    [live.settingSheetConfig],
  );
  const storageKey = buildDraftStorageKey(publicToken, submission?.id);
  const initialValues = useMemo(
    () => submission
      ? createSettingSheetValuesFromSubmissionAnswers(settingSheetConfig.blocks, submission.answers, submission.itunesLinks)
      : createDefaultSettingSheetValues(settingSheetConfig.blocks),
    [settingSheetConfig.blocks, submission],
  );
  const initialDraft = useMemo(
    () => readSettingSheetDraft(storageKey, settingSheetConfig.blocks),
    [settingSheetConfig.blocks, storageKey],
  );

  const [formValues, setFormValues] = useState<SettingSheetFormValues>(() => initialDraft?.values ?? initialValues);
  const [issues, setIssues] = useState<SettingSheetIssue[]>([]);
  const { draftSavedAt, clearDraft } = useSettingSheetDraft({
    storageKey,
    formValues,
    initialSavedAt: initialDraft?.savedAt ?? null,
  });
  const { isRunning: isSubmitting, run: runSubmit } = useSingleFlight();

  // 3-way マージの base（＝自分の編集の出発点になったサーバの状態）と、その版番号。
  // 下書き復元は「自分の編集」側に入るため、base はあくまでサーバから読み込んだ内容。
  const baseValuesRef = useRef<SettingSheetFormValues>(initialValues);
  const [baseVersion, setBaseVersion] = useState<number | null>(submission?.version ?? null);
  const merge = useSubmissionMerge(settingSheetConfig);

  const isSubmissionClosed = isPublicSubmissionClosed(live);
  const submissionStatusMessage = getPublicSubmissionStatusMessage(live);

  const buildSubmittedFormUrl = (submissionId: string) => `${window.location.origin}/public/lives/${publicToken}/submissions/${submissionId}`;

  const submittedFormUrl = submission
    ? buildSubmittedFormUrl(submission.id)
    : null;

  const copyFormUrl = async (url: string | null) => {
    if (!url) {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('編集リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };

  const copySubmittedFormUrl = async () => {
    await copyFormUrl(submittedFormUrl);
  };


  const errorMap = useMemo(
    () => Object.fromEntries(issues.map((issue) => [issue.key, issue.message])) as Record<string, string>,
    [issues],
  );

  const focusIssue = (issue: SettingSheetIssue) => {
    window.setTimeout(() => {
      const target = document.getElementById(fieldIdFromKey(issue.key));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in target && typeof target.focus === 'function') {
          target.focus();
        }
      }
    }, 120);
  };

  const applyServerErrors = (error: ApiClientError) => {
    const serverFieldErrors = error.apiError?.fieldErrors;
    if (!serverFieldErrors) {
      return;
    }

    const nextIssues = Object.entries(serverFieldErrors).map(([key, message]) => ({
      key,
      label: resolveIssueLabel(key, settingSheetConfig),
      message,
    }));
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      focusIssue(nextIssues[0]);
    }
  };

  /** 下書きを捨て、サーバの最新内容を編集の出発点にし直す。 */
  const applyLatestFromServer = (values: SettingSheetFormValues, version: number | null) => {
    clearDraft();
    setFormValues(values);
    setIssues([]);
    baseValuesRef.current = values;
    setBaseVersion(version);
  };

  const updateScopedAnswers = (
    answers: Record<string, SettingSheetFieldValue>,
    blockId: string,
    nextValue: SettingSheetFieldValue,
  ) => ({
    ...answers,
    [blockId]: nextValue,
  });

  const submitValues = (values: SettingSheetFormValues, versionForRequest: number | null) =>
    runSubmit(async () => {
      const basePath = submission
        ? `/public/lives/${publicToken}/setting-sheet/submissions/${submission.id}`
        : `/public/lives/${publicToken}/setting-sheet/submissions`;
      const requestPath = submission && versionForRequest !== null
        ? `${basePath}?baseVersion=${versionForRequest}`
        : basePath;
      const request = toSettingSheetSubmissionPayload(values, settingSheetConfig);

      try {
        const response = submission
          ? await apiClient.put<SettingSheetSubmissionResponse>(requestPath, request)
          : await apiClient.post<SettingSheetSubmissionResponse>(requestPath, request);

        setIssues([]);
        clearDraft();

        if (submission) {
          // 続けて保存できるよう、base をいま送った内容とサーバが返した版番号に揃える
          baseValuesRef.current = values;
          const savedVersion = (response as SettingSheetSubmissionResponse | void)?.version;
          if (typeof savedVersion === 'number') {
            setBaseVersion(savedVersion);
          }
          merge.closeConflict();

          toast.success('提出済みシートを更新しました。', {
            position: 'top-center',
            action: {
              label: '編集用リンクをコピー',
              onClick: () => {
                void copySubmittedFormUrl();
              },
            },
          });
          return;
        }

        const savedSubmission = response as SettingSheetSubmissionResponse | void;
        if (savedSubmission?.id) {
          const savedSubmissionUrl = buildSubmittedFormUrl(savedSubmission.id);
          toast.success('ライブフォームを送信しました。', {
            position: 'top-center',
            action: {
              label: '編集用リンクをコピー',
              onClick: () => {
                void copyFormUrl(savedSubmissionUrl);
              },
            },
          });
          onSubmitted(savedSubmission.id);
          return;
        }

        setFormValues(createDefaultSettingSheetValues(settingSheetConfig.blocks));
        toast.success('ライブフォームを送信しました。', { position: 'top-center' });
      } catch (error: unknown) {
        const latest = parseSubmissionConflict(error);
        if (latest) {
          merge.openConflict(latest, baseValuesRef.current, values);
          toast.error('他の人がこのシートを更新しました。取り込む内容を選んでください。', { position: 'top-center' });
          return;
        }

        const apiError = error instanceof ApiClientError ? error : undefined;
        if (apiError) {
          applyServerErrors(apiError);
        }
        toast.error(apiError?.apiError?.message ?? (submission ? '提出済みシートの更新に失敗しました。' : 'ライブフォームの送信に失敗しました。'), {
          position: 'top-center',
        });
      }
    });

  const handleSubmit = () => {
    if (isSubmissionClosed) {
      toast.error(submissionStatusMessage || '現在は回答を受け付けていません。', { position: 'top-center' });
      return;
    }

    // 設定変更で選択肢から消えた旧値は、画面に出ないまま残るので送信前に落とす
    const values = pruneUnknownOptionValues(formValues, settingSheetConfig);
    if (values !== formValues) {
      setFormValues(values);
    }

    const nextIssues = validateSettingSheetForm(values, settingSheetConfig);
    setIssues(nextIssues);

    if (nextIssues.length > 0) {
      toast.error('未入力または不足している項目があります。', { position: 'top-center' });
      focusIssue(nextIssues[0]);
      return;
    }

    void submitValues(values, baseVersion);
  };

  /** マージ画面での選択を確定し、相手の最新版を base として保存し直す。 */
  const confirmMerge = () => {
    const conflict = merge.conflict;
    const built = merge.buildMergedValues();
    if (!conflict || !built) {
      return;
    }

    const merged = pruneUnknownOptionValues(built, settingSheetConfig);
    setFormValues(merged);

    const nextIssues = validateSettingSheetForm(merged, settingSheetConfig);
    if (nextIssues.length > 0) {
      setIssues(nextIssues);
      merge.closeConflict();
      toast.error('マージ結果に未入力または不足している項目があります。', { position: 'top-center' });
      focusIssue(nextIssues[0]);
      return;
    }

    // 再度競合したときに正しく 3-way できるよう、いま突き合わせた相手の内容を base にする
    baseValuesRef.current = conflict.theirs;
    setBaseVersion(conflict.latestVersion);
    void submitValues(merged, conflict.latestVersion);
  };

  return {
    applyLatestFromServer,
    errorMap,
    focusIssue,
    formValues,
    handleSubmit,
    initialValues,
    isSubmitting,
    isSubmissionClosed,
    issues,
    draftSavedAt,
    setFormValues,
    settingSheetConfig,
    submissionStatusMessage,
    updateScopedAnswers,
    submittedFormUrl,
    copySubmittedFormUrl,
    mergeNodes: merge.nodes,
    mergeRows: merge.rows,
    mergeSelections: merge.selections,
    isMergeOpen: merge.conflict !== null,
    selectMergeChoice: merge.select,
    closeMerge: merge.closeConflict,
    confirmMerge,
  };
}
