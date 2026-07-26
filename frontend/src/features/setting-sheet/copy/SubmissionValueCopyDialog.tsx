/** 前回のセッティングシートの入力値を、編集用リンクから取り込むダイアログ。 */
import { useMemo, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CopyChecklist, type CopyChecklistItem } from '@/features/lives/copy/CopyChecklist';
import {
  normalizeSettingSheetConfig,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';
import { apiClient } from '@/lib/api/client';

import { createSettingSheetValuesFromSubmissionAnswers, type SettingSheetFormValues } from '../types';
import { parseSubmissionLink } from './submission-link';
import { applyValueCopy, buildValueCopyPlan, type ValueCopyPlan } from './value-copy-plan';

interface SubmissionValueCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SettingSheetConfigResponse;
  currentValues: SettingSheetFormValues;
  onApply: (values: SettingSheetFormValues) => void;
}

export const SubmissionValueCopyDialog = ({
  open,
  onOpenChange,
  config,
  currentValues,
  onApply,
}: SubmissionValueCopyDialogProps) => {
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [plan, setPlan] = useState<ValueCopyPlan | null>(null);
  const [sourceValues, setSourceValues] = useState<SettingSheetFormValues | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const reset = () => {
    setPlan(null);
    setSourceValues(null);
    setSourceName('');
    setSelectedKeys(new Set());
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      setLink('');
    }
    onOpenChange(next);
  };

  const handleLoad = async () => {
    const target = parseSubmissionLink(link);
    if (!target) {
      toast.error('編集用リンクの形式が正しくありません', { position: 'top-center' });
      return;
    }

    setIsLoading(true);
    try {
      const [liveResponse, submissionResponse] = await Promise.all([
        apiClient.get<PublicLiveResponse>(`/public/lives/${target.publicToken}`),
        apiClient.get<PublicSettingSheetSubmissionDetailResponse>(
          `/public/lives/${target.publicToken}/setting-sheet/submissions/${target.submissionId}`,
        ),
      ]);
      if (!liveResponse?.settingSheetConfig || !submissionResponse?.id) {
        throw new Error('missing');
      }

      const sourceConfig = normalizeSettingSheetConfig(liveResponse.settingSheetConfig);
      const values = createSettingSheetValuesFromSubmissionAnswers(
        sourceConfig.blocks,
        submissionResponse.answers,
        submissionResponse.itunesLinks,
      );
      const nextPlan = buildValueCopyPlan(config, currentValues, sourceConfig, values);

      setSourceName(`${liveResponse.name} / ${submissionResponse.recordLabel}`);
      setSourceValues(values);
      setPlan(nextPlan);
      setSelectedKeys(new Set(nextPlan.rows.map((row) => row.key)));
    } catch {
      toast.error('リンク先のシートを読み込めませんでした', { position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  };

  const items = useMemo<CopyChecklistItem[]>(
    () =>
      (plan?.rows ?? []).map((row) => ({
        key: row.key,
        title: row.label,
        subtitle: row.typeLabel,
        badge: row.matchedBy === 'label' ? { label: 'ラベル一致', variant: 'outline' as const } : undefined,
        diff: { before: row.currentText, after: row.incomingText },
        detail: row.droppedValues.length > 0
          ? `選択肢に無いため除外: ${row.droppedValues.join(' / ')}`
          : undefined,
        selectable: true,
      })),
    [plan],
  );

  const toggle = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (!plan || !sourceValues) {
      return;
    }
    onApply(applyValueCopy(config, currentValues, plan.rows, selectedKeys, sourceValues.itunesLinks));
    toast.success('前回の入力を取り込みました。内容を確認して送信してください。', { position: 'top-center' });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>前回の入力を取り込む</DialogTitle>
          <DialogDescription>
            {plan
              ? `${sourceName} の内容です。取り込む項目を選んでください。反映後はまだ送信されていません。`
              : '前に提出したシートの「編集用リンク」を貼り付けてください。'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          {plan ? (
            <div className="space-y-3">
              <CopyChecklist
                items={items}
                selected={selectedKeys}
                onToggle={toggle}
                emptyMessage="このフォームに取り込める項目がありませんでした。"
              />
              {plan.unmatchedLabels.length > 0 ? (
                <p className="text-xs text-muted-foreground wrap-break-word">
                  取り込み元に内容が無い項目: {plan.unmatchedLabels.join(' / ')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://.../public/lives/xxxx/submissions/xxxx"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                前回の提出後に表示された「編集用リンクをコピー」で取得したURLです。
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {plan ? (
            <Button type="button" variant="ghost" onClick={reset}>
              <ChevronLeft className="size-4" />
              リンクを入れ直す
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            {plan ? (
              <Button type="button" onClick={handleApply} disabled={selectedKeys.size === 0}>
                {selectedKeys.size}件を反映
              </Button>
            ) : (
              <Button type="button" onClick={() => void handleLoad()} disabled={isLoading || !link.trim()}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                読み込む
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
