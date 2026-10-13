/** 書式エディタの上の帯（戻る・書式の名前・見本の提出・プレビュー・出力・保存）。 */
import { Download, Eye, Loader2, Save } from 'lucide-react';

import { BackButton } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TourButton } from '@/features/tutorial/TourButton';
import { VENUE_FORM_TOUR } from '@/features/tutorial/tours/venue-form-tour';
import { cn } from '@/lib/utils';

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
  onOpenExport: () => void;
}

export function VenueEditorHeader(props: EditorHeaderProps) {
  const { backTo, liveName, canEdit } = props;
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <BackButton to={backTo} />
        <div className="min-w-0">
          <LayoutNameInput {...props} />
          <p className="truncate px-2 text-xs text-muted-foreground">{liveName}</p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <TourButton steps={VENUE_FORM_TOUR} />
        <SampleSelect {...props} />
        <div className="mx-1 h-6 w-px bg-border" />
        <PreviewButton {...props} />
        <ExportButton {...props} />
        {canEdit ? <SaveButton {...props} /> : null}
      </div>
    </header>
  );
}

/** 書式の名前。編集できる人には枠の目立たない入力欄、それ以外には見出しとして出す。 */
export function LayoutNameInput({ name, onNameChange, canEdit }: EditorHeaderProps) {
  if (!canEdit) return <h1 className="truncate px-2 text-base font-semibold">{name}</h1>;
  return (
    <Input
      aria-label="書式の名前"
      value={name}
      maxLength={100}
      onChange={(event) => onNameChange(event.target.value)}
      className="h-8 w-60 max-w-full border-transparent px-2 text-base font-semibold shadow-none hover:border-input focus-visible:border-ring"
    />
  );
}

export function SampleSelect({ submissions, previewSubmissionId, onChangePreviewSubmission, className }: EditorHeaderProps & { className?: string }) {
  return (
    <Select value={previewSubmissionId ?? ''} onValueChange={onChangePreviewSubmission} disabled={submissions.length === 0}>
      <SelectTrigger className={cn('h-8 w-48 text-xs', className)} aria-label="見本に使う提出" data-tour="venue-sample">
        <SelectValue placeholder={submissions.length === 0 ? '提出がありません' : '見本の提出'} />
      </SelectTrigger>
      <SelectContent>
        {submissions.map((submission) => <SelectItem key={submission.id} value={submission.id}>{submission.recordLabel}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function PreviewButton({ onOpenPreview, previewSubmissionId }: EditorHeaderProps) {
  return (
    <Button variant="outline" size="sm" className="gap-1" onClick={onOpenPreview} disabled={!previewSubmissionId} data-tour="venue-preview">
      <Eye className="size-4" />プレビュー
    </Button>
  );
}

export function ExportButton({ onOpenExport, submissions }: EditorHeaderProps) {
  return (
    <Button variant="outline" size="sm" className="gap-1" onClick={onOpenExport} disabled={submissions.length === 0} data-tour="venue-export">
      <Download className="size-4" />PDF出力
    </Button>
  );
}

export function SaveButton({ onSave, isSaving, isDirty }: EditorHeaderProps) {
  return (
    <Button size="sm" className="gap-1" onClick={onSave} disabled={isSaving} data-tour="venue-save">
      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {isDirty ? '保存 *' : '保存'}
    </Button>
  );
}
