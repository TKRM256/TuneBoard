/** 書式エディタの上の帯（戻る・書式の名前・見本の提出・保存・プレビュー・出力）。 */
import { Download, Eye, Loader2, Save } from 'lucide-react';

import { BackButton } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TourButton } from '@/features/tutorial/TourButton';
import { VENUE_FORM_TOUR } from '@/features/tutorial/tours/venue-form-tour';

import type { SettingSheetSubmissionResponse } from '../types/live-types';

export interface EditorHeaderProps {
  backTo: string;
  liveName: string;
  name: string;
  onNameChange: (name: string) => void;
  submissions: SettingSheetSubmissionResponse[];
  previewSubmissionId: string | null;
  onChangePreviewSubmission: (id: string) => void;
  canEdit: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onOpenPreview: () => void;
  /** 提出一覧から来たとき（出力する提出が決まっているとき）だけ出す */
  downloadCount: number;
  isDownloading: boolean;
  onDownload: () => void;
}

export function VenueEditorHeader(props: EditorHeaderProps) {
  const { backTo, liveName, canEdit } = props;
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <BackButton to={backTo} />
        <div className="min-w-0">
          <LayoutNameInput {...props} />
          <p className="truncate text-xs text-muted-foreground">{liveName}</p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <TourButton steps={VENUE_FORM_TOUR} />
        <SampleSelect {...props} />
        {canEdit ? <SaveButton {...props} /> : null}
        <Button size="sm" className="gap-1" onClick={props.onOpenPreview} disabled={!props.previewSubmissionId} data-tour="venue-preview">
          <Eye className="size-4" />プレビュー
        </Button>
        <DownloadButton {...props} />
      </div>
    </header>
  );
}

/** 書式の名前。編集できる人には入力欄、それ以外には見出しとして出す。 */
export function LayoutNameInput({ name, onNameChange, canEdit }: EditorHeaderProps) {
  if (!canEdit) return <h1 className="truncate text-base font-semibold">{name}</h1>;
  return (
    <Input
      aria-label="書式の名前"
      value={name}
      maxLength={100}
      onChange={(event) => onNameChange(event.target.value)}
      className="h-8 w-56 max-w-full text-sm font-semibold"
    />
  );
}

export function SampleSelect({ submissions, previewSubmissionId, onChangePreviewSubmission }: EditorHeaderProps) {
  return (
    <Select value={previewSubmissionId ?? ''} onValueChange={onChangePreviewSubmission} disabled={submissions.length === 0}>
      <SelectTrigger className="h-8 w-48 text-xs" aria-label="見本に使う提出" data-tour="venue-sample">
        <SelectValue placeholder={submissions.length === 0 ? '提出がありません' : '見本の提出'} />
      </SelectTrigger>
      <SelectContent>
        {submissions.map((submission) => <SelectItem key={submission.id} value={submission.id}>{submission.recordLabel}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function SaveButton({ onSave, isSaving, isDirty }: EditorHeaderProps) {
  return (
    <Button variant="outline" size="sm" className="gap-1" onClick={onSave} disabled={isSaving} data-tour="venue-save">
      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {isDirty ? '保存 *' : '保存'}
    </Button>
  );
}

export function DownloadButton({ downloadCount, isDownloading, onDownload }: EditorHeaderProps) {
  if (downloadCount === 0) return null;
  return (
    <Button size="sm" className="gap-1" onClick={onDownload} disabled={isDownloading}>
      {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {downloadCount > 1 ? `${downloadCount}件をZipで保存` : 'PDFを保存'}
    </Button>
  );
}
