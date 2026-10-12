/** ライブの PDF 書式の一覧。書式を作る・開く・消す。会場の書式を取り込んだものも、白紙に並べたものも同じように扱う。 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CopyPlus, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/original/ConfirmDialog';
import { PageHeader } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';

import type { LiveResponse } from '../types/live-types';
import { LayoutCopyDialog } from './LayoutCopyDialog';
import { LayoutCreateDialog } from './LayoutCreateDialog';
import { deleteLayout, fetchLayouts, type LayoutSummary } from './venue-form-api';

export const PdfLayoutsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const navigate = useNavigate();
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
    ])
      .then(([liveRes, layoutRes, tenant]) => {
        if (cancelled) return;
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
  }, [tenantId, liveId]);

  if (!tenantId || !liveId) return <Navigate to="/tenants" replace />;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!live) return <Navigate to={`/tenants/${tenantId}/lives/${liveId}`} replace />;

  const editorPath = (layoutId: string) => `/tenants/${tenantId}/lives/${liveId}/pdf-layouts/${layoutId}`;

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
        backTo={`/tenants/${tenantId}/lives/${liveId}`}
        title="PDF書式"
        description="提出を PDF にするときの書式です。会場の書式に書き込むことも、白紙に並べることもできます。"
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

      {layouts.length === 0 ? (
        <Card className="items-center gap-2 px-4 py-10 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">書式はまだありません</p>
          <p className="max-w-md text-xs text-muted-foreground [word-break:auto-phrase]">
            書式を作らなくても、提出確認の「PDF出力」からフォームの項目を並べた PDF を出せます。
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {layouts.map((layout) => (
            <li key={layout.id}>
              <Card className="flex-row items-center gap-3 px-4 py-3">
                <Link to={editorPath(layout.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{layout.name}</span>
                    <span className="block text-xs text-muted-foreground">{layout.pageCount}ページ</span>
                  </span>
                </Link>
                {isAdmin ? (
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`${layout.name}を消す`} onClick={() => setDeleting(layout)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

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
        description="この書式で PDF を出せなくなります。"
        confirmLabel="消す"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
};
