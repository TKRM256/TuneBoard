/** ライブの PDF 書式の一覧。書式を作る・開く・消す。会場の書式を取り込んだものも、白紙に並べたものも同じように扱う。 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CopyPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/original/ConfirmDialog';
import { PageHeader } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';

import type { LiveResponse, SettingSheetSubmissionResponse } from '../types/live-types';
import { LayoutCopyDialog } from './LayoutCopyDialog';
import { LayoutCreateDialog } from './LayoutCreateDialog';
import { PdfLayoutList } from './PdfLayoutList';
import { useLayoutDownload } from './use-layout-download';
import { deleteLayout, fetchLayouts, type LayoutSummary } from './venue-form-api';

export const PdfLayoutsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids') ?? '';
  /** 提出確認から「PDF出力」で来たときの、出力する提出 */
  const targetIds = useMemo(() => idsParam.split(',').map((id) => id.trim()).filter(Boolean), [idsParam]);
  const [submissions, setSubmissions] = useState<SettingSheetSubmissionResponse[]>([]);
  const exporter = useLayoutDownload(liveId ?? '', targetIds);
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [deleting, setDeleting] = useState<LayoutSummary | null>(null);
  const remove = useSingleFlight();

  useEffect(() => {
    if (!tenantId || !liveId) return;
    let cancelled = false;
    Promise.all([
      apiClient.get<LiveResponse>(`/lives/${liveId}`),
      fetchLayouts(liveId),
      apiClient.get<{ role: string }>(`/tenants/get/${tenantId}`),
      idsParam ? apiClient.get<SettingSheetSubmissionResponse[]>(`/lives/${liveId}/setting-sheet/submissions`) : Promise.resolve([]),
    ])
      .then(([liveRes, layoutRes, tenant, submissionRes]) => {
        if (cancelled) return;
        setSubmissions(submissionRes ?? []);
        setLive(liveRes ?? null);
        setLayouts(layoutRes);
        setIsAdmin(tenant?.role === 'ADMIN' || tenant?.role === 'OWNER');
      })
      .catch(() => {
        if (!cancelled) toast.error('書式を読み込めませんでした', { position: 'top-center' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, liveId, idsParam]);

  if (!tenantId || !liveId) return <Navigate to="/tenants" replace />;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!live) return <Navigate to={`/tenants/${tenantId}/lives/${liveId}`} replace />;

  const livePath = `/tenants/${tenantId}/lives/${liveId}`;
  const targetQuery = targetIds.length > 0 ? `?ids=${targetIds.join(',')}` : '';
  const editorPath = (layoutId: string) => `${livePath}/pdf-layouts/${layoutId}${targetQuery}`;
  // 1 件の詳細から来たときは、戻るとその詳細が開く
  const backTo = targetIds.length === 0 ? livePath
    : `${livePath}/submissions${targetIds.length === 1 ? `?submission=${targetIds[0]}` : ''}`;

  const handleDelete = () => void remove.run(async () => {
    if (!deleting) return;
    try {
      await deleteLayout(liveId, deleting.id);
      setLayouts((prev) => prev.filter((layout) => layout.id !== deleting.id));
      toast.success('書式を消しました', { position: 'top-center' });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? '書式を消せませんでした', { position: 'top-center' });
    } finally {
      setDeleting(null);
    }
  });

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: 'テナント一覧', to: '/tenants' },
          { label: live.tenantName, to: `/tenants/${tenantId}/lives` },
          { label: live.name, to: `/tenants/${tenantId}/lives/${liveId}` },
          { label: 'PDF書式' },
        ]}
        backTo={backTo}
        title="PDF書式"
        description={live.name}
        actions={isAdmin ? (
          <>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsCopyOpen(true)}>
              <CopyPlus className="size-4" />他のライブから取り込む
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setIsCreateOpen(true)} data-tour="layouts-create">
              <Plus className="size-4" />書式を作る
            </Button>
          </>
        ) : null}
      />

      {targetIds.length > 0 ? (
        <section className="space-y-1" aria-label="出力する提出">
          <p className="text-sm text-muted-foreground">出力する提出</p>
          <p className="text-base font-semibold wrap-break-word">{describeTargets(targetIds, submissions)}</p>
        </section>
      ) : null}

      <PdfLayoutList
        layouts={layouts}
        editorPath={editorPath}
        onDelete={isAdmin ? setDeleting : undefined}
        exporter={targetIds.length > 0 ? { ...exporter, count: targetIds.length } : undefined}
      />

      <LayoutCreateDialog
        key={isCreateOpen ? 'open' : 'closed'}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        liveId={liveId}
        defaultName={layouts.length === 0 ? '標準' : `書式${layouts.length + 1}`}
        onCreated={(layout) => navigate(editorPath(layout.id))}
      />
      <LayoutCopyDialog open={isCopyOpen} onOpenChange={setIsCopyOpen} currentLiveId={liveId} onCopied={(layout) => navigate(editorPath(layout.id))} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title={`「${deleting?.name ?? ''}」を消しますか？`}
        description="元に戻せません。"
        confirmLabel="消す"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
};

function describeTargets(ids: string[], submissions: SettingSheetSubmissionResponse[]) {
  const labels = ids.map((id) => submissions.find((submission) => submission.id === id)?.recordLabel).filter(Boolean);
  if (ids.length === 1) return labels[0] ?? '1件';
  const shown = labels.slice(0, 3).join('、');
  return shown ? `${shown}${ids.length > 3 ? ` ほか${ids.length - 3}件` : ''}` : `${ids.length}件`;
}
