/** 会場書式エディタの上の帯（戻る・見本の提出・取り込み・保存・プレビュー・出力）。 */
import { CopyPlus, Download, Eye, Loader2, Save } from 'lucide-react';

import { BackButton } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { TourButton } from '@/features/tutorial/TourButton';
import { VENUE_FORM_TOUR } from '@/features/tutorial/tours/venue-form-tour';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { SettingSheetSubmissionResponse } from '../types/live-types';

interface Props {
  backTo: string;
  liveName: string;
  submissions: SettingSheetSubmissionResponse[];
  previewSubmissionId: string | null;
  onChangePreviewSubmission: (id: string) => void;
  canEdit: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onOpenCopy: () => void;
  onOpenPreview: () => void;
  /** 提出一覧から来たとき（出力する提出が決まっているとき）だけ出す */
  downloadCount: number;
  isDownloading: boolean;
  onDownload: () => void;
}

export function VenueEditorHeader({
  backTo,
  liveName,
  submissions,
  previewSubmissionId,
  onChangePreviewSubmission,
  canEdit,
  isDirty,
  isSaving,
  onSave,
  onOpenCopy,
  onOpenPreview,
  downloadCount,
  isDownloading,
  onDownload,
}: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2">
      <div className="flex items-center gap-3">
        <BackButton to={backTo} />
        <div>
          <h1 className="text-base font-semibold">会場書式</h1>
          <p className="text-xs text-muted-foreground">{liveName}</p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <TourButton steps={VENUE_FORM_TOUR} />
        <Select value={previewSubmissionId ?? ''} onValueChange={onChangePreviewSubmission} disabled={submissions.length === 0}>
          <SelectTrigger className="h-8 w-48 text-xs" aria-label="見本に使う提出" data-tour="venue-sample">
            <SelectValue placeholder={submissions.length === 0 ? '提出がありません' : '見本の提出'} />
          </SelectTrigger>
          <SelectContent>
            {submissions.map((submission) => <SelectItem key={submission.id} value={submission.id}>{submission.recordLabel}</SelectItem>)}
          </SelectContent>
        </Select>
        {canEdit ? (
          <Button variant="ghost" size="sm" className="gap-1" onClick={onOpenCopy}>
            <CopyPlus className="size-4" />他のライブから取り込む
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" size="sm" className="gap-1" onClick={onSave} disabled={isSaving} data-tour="venue-save">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isDirty ? '保存 *' : '保存'}
          </Button>
        ) : null}
        <Button size="sm" className="gap-1" onClick={onOpenPreview} disabled={!previewSubmissionId} data-tour="venue-preview">
          <Eye className="size-4" />プレビュー
        </Button>
        {downloadCount > 0 ? (
          <Button size="sm" className="gap-1" onClick={onDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {downloadCount > 1 ? `${downloadCount}件をZipで保存` : 'PDFを保存'}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
