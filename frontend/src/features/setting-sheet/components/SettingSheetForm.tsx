import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, History, RefreshCw, Send } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  getPublicSubmissionStatusMessage,
  formatDeadline,
  formatLiveDate,
  formatOptionalText,
  LIVE_STATUS_LABELS,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetOptionSource,
} from '@/features/lives/types/live-types';

import {
  resolveOptionSourceValues,
} from '../types';
import { SettingSheetFieldRenderer } from './SettingSheetFieldRenderer';
import { useSettingSheetForm } from '../hooks/useSettingSheetForm';
import { useDraftReset } from '../hooks/useDraftReset';
import { MergeConflictDialog } from '../merge/components/MergeConflictDialog';
import { SubmissionValueCopyDialog } from '../copy/SubmissionValueCopyDialog';
import { DraftResetDialog } from '../reset/DraftResetDialog';

interface SettingSheetFormProps {
  publicToken: string;
  live: PublicLiveResponse;
  submission: PublicSettingSheetSubmissionDetailResponse | null;
}

export const SettingSheetForm = ({ publicToken, live, submission }: SettingSheetFormProps) => {
  const navigate = useNavigate();
  const [isValueCopyOpen, setIsValueCopyOpen] = useState(false);
  const {
    draftSavedAt,
    errorMap,
    focusIssue,
    formValues,
    handleSubmit,
    isSubmitting,
    isSubmissionClosed,
    issues,
    setFormValues,
    settingSheetConfig,
    submissionStatusMessage,
    updateScopedAnswers,
    submittedFormUrl,
    copySubmittedFormUrl,
    mergeNodes,
    mergeRows,
    mergeSelections,
    isMergeOpen,
    selectMergeChoice,
    closeMerge,
    confirmMerge,
    applyLatestFromServer,
  } = useSettingSheetForm({
    publicToken,
    live,
    submission,
    onSubmitted: (submissionId) => navigate(`/public/lives/${publicToken}/submissions/${submissionId}`, { replace: true }),
  });

  const draftReset = useDraftReset({
    publicToken,
    submissionId: submission?.id,
    config: settingSheetConfig,
    formValues,
    onApply: applyLatestFromServer,
  });

  const resolveOptions = (block: SettingSheetBlock) => {
    if (!block.optionSource) {
      return block.options;
    }
    return resolveOptionSourceValues(settingSheetConfig.blocks, formValues.answers, block.optionSource as SettingSheetOptionSource);
  };

  return (
    <div className="min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid min-w-0 max-w-7xl gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="min-w-0 overflow-hidden text-card-foreground shadow-sm backdrop-blur">
            <CardHeader className="space-y-5 pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em]">TUNEBOARD</p>
                <div className="flex items-center gap-2">
                  <ThemeToggle className="shrink-0" />
                  <Badge variant={live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                    {LIVE_STATUS_LABELS[live.status]}
                  </Badge>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">{live.name}</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{settingSheetConfig.title}</p>
                {settingSheetConfig.description ? <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{settingSheetConfig.description}</p> : null}
              </div>
              <div className="grid gap-3 rounded-2xl border p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">開催日</p>
                  <p className="mt-1 font-medium text-card-foreground">{formatLiveDate(live.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">会場</p>
                  <p className="mt-1 font-medium text-card-foreground">{formatOptionalText(live.location)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">回答締切</p>
                  <p className="mt-1 font-medium text-card-foreground">{formatDeadline(live.deadlineAt)}</p>
                </div>
              </div>
              {settingSheetConfig.publicSubmissionEnabled && (
                <a
                  href={`/public/lives/${publicToken}/submissions/shared`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-2xl border p-4 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                >
                  <ExternalLink className="size-4 shrink-0" />
                  <span className="min-w-0 wrap-break-word">提出済み一覧を見る</span>
                </a>
              )}
              {!isSubmissionClosed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsValueCopyOpen(true)}
                >
                  <History className="size-4" />
                  前回の入力を取り込む
                </Button>
              ) : null}
              {/* 下書きにまつわる操作をこのパネルにまとめると、ボタンの意味が文脈で分かる */}
              <div className="space-y-2 rounded-2xl border border-dashed p-2 text-sm">
                <p className="text-sm text-muted-foreground">
                  {draftSavedAt ? `下書きを自動保存: ${new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(draftSavedAt))}` : 'まだ下書き保存はありません。'}
                </p>
                {submission ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {draftReset.isAvailable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void draftReset.open()}
                        disabled={draftReset.isLoading || isSubmitting}
                      >
                        <RefreshCw className={`size-4 ${draftReset.isLoading ? 'animate-spin' : ''}`} />
                        下書きを破棄して最新に戻す
                      </Button>
                    ) : null}
                    {submittedFormUrl ? (
                      <Button type="button" variant="outline" size="sm" onClick={copySubmittedFormUrl}>
                        編集用リンクをコピー
                        <Copy className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>


            </CardHeader>
          </Card>
        </aside>

        <main className="min-w-0 space-y-6">

          {isSubmissionClosed ? (
            <Alert>
              <AlertTitle>現在は送信できません</AlertTitle>
              <AlertDescription>{submissionStatusMessage || getPublicSubmissionStatusMessage(live)}</AlertDescription>
            </Alert>
          ) : null}

          {issues.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>入力内容に問題があります</AlertTitle>
              <AlertDescription>
                <ul className="space-y-2">
                  {issues.map((issue) => (
                    <li key={issue.key}>
                      <button type="button" onClick={() => focusIssue(issue)} className="text-left underline underline-offset-4">
                        {issue.label}: {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader className="border-b pb-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                <h2 className="text-xl font-semibold text-card-foreground">セッティングシート回答</h2>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-4 xl:grid-cols-6">
              {settingSheetConfig.blocks.map((block) => (
                <SettingSheetFieldRenderer
                  key={block.id}
                  block={block}
                  scopedAnswers={formValues.answers}
                  pathPrefix="answers."
                  errorMap={errorMap}
                  resolveOptions={resolveOptions}
                  setScopedAnswer={(blockId, nextValue) => setFormValues((current) => ({
                    ...current,
                    answers: updateScopedAnswers(current.answers, blockId, nextValue),
                  }))}
                  updateScopedAnswers={updateScopedAnswers}
                  itunesLinks={formValues.itunesLinks}
                  onItunesLinkChange={(itemId, link) => setFormValues((current) => {
                    const next = { ...current.itunesLinks };
                    if (link) {
                      next[itemId] = link;
                    } else {
                      delete next[itemId];
                    }
                    return { ...current, itunesLinks: next };
                  })}
                />
              ))}
            </CardContent>
          </Card>

          <div className="sticky bottom-4 flex justify-end">
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || isSubmissionClosed} className="w-full px-6 sm:w-auto">
              <Send className="size-4" />
              {isSubmitting ? (submission ? '更新中...' : '送信中...') : (submission ? '更新する' : settingSheetConfig.submitButtonLabel)}
            </Button>
          </div>
        </main>
      </div>

      <MergeConflictDialog
        open={isMergeOpen}
        onOpenChange={(open) => { if (!open) closeMerge(); }}
        nodes={mergeNodes}
        rows={mergeRows}
        selections={mergeSelections}
        onSelect={selectMergeChoice}
        onConfirm={confirmMerge}
        isSubmitting={isSubmitting}
      />

      <SubmissionValueCopyDialog
        open={isValueCopyOpen}
        onOpenChange={setIsValueCopyOpen}
        config={settingSheetConfig}
        currentValues={formValues}
        onApply={setFormValues}
      />

      <DraftResetDialog
        open={draftReset.isOpen}
        onOpenChange={(open) => { if (!open) draftReset.close(); }}
        rows={draftReset.rows}
        onConfirm={draftReset.confirm}
      />
    </div>
  );
};
