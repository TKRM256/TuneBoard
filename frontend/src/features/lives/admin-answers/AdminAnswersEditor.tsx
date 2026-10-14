/** 提出の詳細画面で、管理者だけが入力する項目（出順など）をまとめて入力する。 */
import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import type { PublicSettingSheetSubmissionDetailResponse, SettingSheetBlock, SettingSheetSubmissionAnswerResponse } from '../types/live-types';
import { AdminAnswerInput } from './AdminAnswerInput';
import { readAnswerValues, resolveAdminOptions } from './admin-answer-model';
import { saveAdminAnswers } from './admin-answers-api';

interface Props {
  liveId: string;
  detail: PublicSettingSheetSubmissionDetailResponse;
  blocks: SettingSheetBlock[];
  onSaved: (submissionId: string, answers: SettingSheetSubmissionAnswerResponse[]) => void;
}

export function AdminAnswersEditor({ liveId, detail, blocks, onSaved }: Props) {
  const [draft, setDraft] = useState<Record<string, string[]>>(() => initialDraft(blocks, detail));
  const { run, isRunning } = useSingleFlight();
  const dirty = blocks.some((block) => !sameValues(draft[block.id] ?? [], readAnswerValues(detail.answers, block.id)));

  const handleSave = () => {
    void run(async () => {
      try {
        const saved = await saveAdminAnswers(liveId, detail.id, blocks.map((block) => ({
          fieldId: block.id,
          values: draft[block.id] ?? [],
        })));
        onSaved(detail.id, saved);
        toast.success('管理者入力を保存しました', { position: 'top-center' });
      } catch (error) {
        const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
        toast.error(message ?? '保存に失敗しました', { position: 'top-center' });
      }
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">管理者入力</p>
        <Button size="sm" onClick={handleSave} disabled={!dirty || isRunning} className="gap-1">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.id} className="space-y-1">
            <Label htmlFor={`admin-${detail.id}-${block.id}`} className="text-xs">{block.label}</Label>
            <AdminAnswerInput
              block={block}
              inputId={`admin-${detail.id}-${block.id}`}
              values={draft[block.id] ?? []}
              options={resolveAdminOptions(block, detail.answers)}
              onChange={(values) => setDraft((prev) => ({ ...prev, [block.id]: values }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function initialDraft(blocks: SettingSheetBlock[], detail: PublicSettingSheetSubmissionDetailResponse) {
  return Object.fromEntries(blocks.map((block) => [block.id, readAnswerValues(detail.answers, block.id)]));
}

function sameValues(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
