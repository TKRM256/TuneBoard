/** PDF 書式のエディタ。読み込み・保存・プレビュー・出力をまとめ、画面の並びは PC とスマホで分ける。 */
import { useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { UnsavedChangesDialog } from '@/components/original/UnsavedChangesDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { ApiClientError } from '@/lib/api/type';

import { ExpressionPreviewProvider } from '../canvas-shared/expression/ExpressionPreviewContext';
import { buildFieldCatalog } from '../canvas-shared/field-catalog';
import type { SettingSheetBlock } from '../types/live-types';
import { EditorExportDialog } from './EditorExportDialog';
import { LayoutEditorDesktop } from './LayoutEditorDesktop';
import { LayoutEditorMobile } from './LayoutEditorMobile';
import { useGridHeightFit } from './useGridHeightFit';
import { useVenueFormEditor } from './useVenueFormEditor';
import { useVenueFormPageData } from './useVenueFormPageData';
import { VenuePreviewDialog } from './VenuePreviewDialog';
import { saveLayout } from './venue-form-api';
import { emptyVenueForm, type VenueAsset } from './venue-form-schema';

export const VenueFormEditorPage = () => {
  const { tenantId, liveId, layoutId } = useParams<{ tenantId: string; liveId: string; layoutId: string }>();
  const [searchParams] = useSearchParams();
  const pickedIds = useMemo(() => (searchParams.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean), [searchParams]);
  const isMobile = useIsMobile();
  const editor = useVenueFormEditor();
  const [savedJson, setSavedJson] = useState(JSON.stringify(emptyVenueForm()));
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  /** 読み込んだ（保存した）ときの版の印。他の人の保存と食い違えば保存を止める */
  const [revision, setRevision] = useState<string | undefined>(undefined);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const save = useSingleFlight();

  const { data, setData, isLoading } = useVenueFormPageData(tenantId, liveId, layoutId, (loaded) => {
    editor.load(loaded.document);
    setSavedJson(JSON.stringify(loaded.document));
    setName(loaded.name);
    setSavedName(loaded.name);
    setRevision(loaded.revision);
    setPreviewId(pickedIds[0] ?? loaded.submissions[0]?.id ?? null);
  });
  const isDirty = JSON.stringify(editor.doc) !== savedJson || name !== savedName;
  const leaveGuard = useUnsavedChangesWarning(isDirty);
  const catalog = useMemo(() => buildFieldCatalog(data?.config), [data?.config]);
  const blocksById = useMemo(() => indexBlocks(data?.config.blocks ?? []), [data?.config]);
  const gridFit = useGridHeightFit({ liveId: liveId ?? '', submissionId: previewId, doc: editor.doc, onUpdateElement: editor.updateElement });

  if (!tenantId || !liveId || !layoutId) return <Navigate to="/tenants" replace />;
  const backTo = `/tenants/${tenantId}/lives/${liveId}/pdf-layouts${pickedIds.length > 0 ? `?ids=${pickedIds.join(',')}` : ''}`;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!data) return <Navigate to={`/tenants/${tenantId}/lives/${liveId}/pdf-layouts`} replace />;

  const handleSave = () => void save.run(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('書式の名前を入れてください', { position: 'top-center' });
      return;
    }
    try {
      const response = await saveLayout(liveId, layoutId, trimmed, editor.doc, revision);
      setRevision(response.revision);
      setSavedJson(JSON.stringify(editor.doc));
      setName(trimmed);
      setSavedName(trimmed);
      setData({ ...data, assets: response.assets });
      toast.success('書式を保存しました', { position: 'top-center' });
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : '保存に失敗しました', { position: 'top-center' });
    }
  });

  const previewLabel = data.submissions.find((submission) => submission.id === previewId)?.recordLabel ?? '';
  const header = {
    backTo,
    liveName: data.live.name,
    name,
    onNameChange: setName,
    submissions: data.submissions,
    previewSubmissionId: previewId,
    onChangePreviewSubmission: setPreviewId,
    canEdit: data.isAdmin,
    isDirty,
    isSaving: save.isRunning,
    onSave: handleSave,
    onOpenPreview: () => setIsPreviewOpen(true),
    onOpenExport: () => setIsExportOpen(true),
  };
  const editorProps = {
    header,
    liveId,
    editor,
    catalog,
    blocksById,
    assets: data.assets,
    onAssetUploaded: (asset: VenueAsset) => setData({ ...data, assets: [...data.assets, asset] }),
    gridFit,
  };

  return (
    <ExpressionPreviewProvider liveId={liveId} submissionId={previewId ?? undefined} submissionLabel={previewLabel}>
      {isMobile ? <LayoutEditorMobile {...editorProps} /> : <LayoutEditorDesktop {...editorProps} />}
      <VenuePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        liveId={liveId}
        submissions={data.submissions}
        submissionId={previewId}
        onChangeSubmission={setPreviewId}
        document={editor.doc}
      />
      <EditorExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        liveId={liveId}
        document={editor.doc}
        submissions={data.submissions}
        pickedIds={pickedIds}
        sampleId={previewId}
      />
      <UnsavedChangesDialog guard={leaveGuard} />
    </ExpressionPreviewProvider>
  );
};

function indexBlocks(blocks: SettingSheetBlock[], out = new Map<string, SettingSheetBlock>()) {
  for (const block of blocks) {
    out.set(block.id, block);
    indexBlocks(block.fields, out);
    for (const variant of block.variants ?? []) indexBlocks(variant.fields, out);
  }
  return out;
}
