/** 提出一覧の表の中で、管理者入力の項目をその場で入力する（出順を全バンド分まとめて入れるなど）。
 *  選択式は選んだ時点で、文字は欄から離れた時点で保存する。 */
import { useState, type FocusEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import type { PublicSettingSheetSubmissionDetailResponse, SettingSheetBlock, SettingSheetSubmissionAnswerResponse } from '../types/live-types';
import { AdminAnswerInput } from './AdminAnswerInput';
import { readAnswerValues, resolveAdminOptions } from './admin-answer-model';
import { saveAdminAnswers } from './admin-answers-api';

interface Props {
  liveId: string;
  detail: PublicSettingSheetSubmissionDetailResponse;
  block: SettingSheetBlock;
  onSaved: (submissionId: string, answers: SettingSheetSubmissionAnswerResponse[]) => void;
}

const SAVE_ON_CHANGE: Array<SettingSheetBlock['type']> = ['SINGLE_SELECT', 'BOOLEAN'];

export function AdminAnswerCell({ liveId, detail, block, onSaved }: Props) {
  const stored = readAnswerValues(detail.answers, block.id);
  const [draft, setDraft] = useState<string[] | null>(null);
  const { run, isRunning } = useSingleFlight();
  const values = draft ?? stored;

  const save = (next: string[]) => {
    if (sameValues(next, stored)) {
      setDraft(null);
      return;
    }
    setDraft(next);
    void run(async () => {
      try {
        const saved = await saveAdminAnswers(liveId, detail.id, [{ fieldId: block.id, values: next }]);
        onSaved(detail.id, saved);
        setDraft(null);
      } catch (error) {
        setDraft(null);
        const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
        toast.error(message ?? `${block.label}を保存できませんでした`, { position: 'top-center' });
      }
    });
  };

  const handleChange = (next: string[]) => {
    if (SAVE_ON_CHANGE.includes(block.type)) {
      save(next);
    } else {
      setDraft(next);
    }
  };

  // 分・秒の 2 つの欄の間で移るときは保存しない
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    if (draft !== null && !SAVE_ON_CHANGE.includes(block.type)) save(draft);
  };

  return (
    <div
      className="flex min-w-36 items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.target.blur();
      }}
    >
      <div className="min-w-0 flex-1">
        <AdminAnswerInput
          block={block}
          inputId={`admin-cell-${detail.id}-${block.id}`}
          values={values}
          options={resolveAdminOptions(block, detail.answers)}
          onChange={handleChange}
          compact
        />
      </div>
      {isRunning ? <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-label="保存中" /> : null}
    </div>
  );
}

function sameValues(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
