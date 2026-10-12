/** Live submissions list with detail dialog and song duplicate detection. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { FileDown, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { apiClient } from '@/lib/api/client';
import type { TenantsResponse } from '@/features/tenants/types/tenant-types';
import {
  formatLiveDate,
  type LiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
  type SongDuplicateResponse,
} from '../types/live-types';
import { applyAdminAnswers, collectAdminBlocks } from '../admin-answers/admin-answer-model';
import { PdfExportDialog } from '../venue-form/PdfExportDialog';
import { SongDuplicatesPanel } from '../components/SongDuplicatesPanel';
import { SubmissionDetailDialog } from '../components/SubmissionDetailDialog';
import { SubmissionsTable } from '../components/SubmissionsTable';
import { collectColumns } from '../helpers/submission-table-helpers';
import { ALL_COLUMNS_VALUE, useSubmissionTableView } from '../hooks/use-submission-table-view';
import { TrashButton, TrashSheet } from '@/components/original/TrashSheet';
import { TourButton } from '@/features/tutorial/TourButton';
import { SUBMISSIONS_TOUR } from '@/features/tutorial/tours/submissions-tour';
import { useKeyedSingleFlight, useSingleFlight } from '@/hooks/use-single-flight';

const getSubmissionActionKey = (id: string) => `submission:${id}`;
const getDuplicateActionKey = (normalizedTitle: string) => `duplicate:${normalizedTitle}`;

export const LiveSubmissionsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<SongDuplicateResponse | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trashedDetails, setTrashedDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashFetched, setTrashFetched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { isRunning: isDuplicateLoading, run: runDuplicateRefresh } = useSingleFlight();
  const { run: runSubmissionAction, isRunning: isSubmissionActionRunning } = useKeyedSingleFlight<string>();
  const { run: runDuplicateDismiss, isRunning: isDuplicateDismissRunning } = useKeyedSingleFlight<string>();

  useEffect(() => {
    if (!liveId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [liveResponse, configResponse, detailsResponse, duplicatesResponse, tenantResponse] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
          apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`),
          apiClient.get<SongDuplicateResponse>(`/lives/${liveId}/songs/duplicates`),
          tenantId ? apiClient.get<TenantsResponse>(`/tenants/get/${tenantId}`) : Promise.resolve(null),
        ]);

        if (!liveResponse || !configResponse) {
          throw new Error('required data missing');
        }

        if (cancelled) {
          return;
        }

        setLive(liveResponse);
        setConfig(configResponse);
        setDetails(detailsResponse ?? []);
        setDuplicates(duplicatesResponse ?? null);
        if (tenantResponse) setIsAdmin(tenantResponse.role === 'ADMIN' || tenantResponse.role === 'OWNER');
      } catch {
        if (!cancelled) {
          toast.error('提出情報の取得に失敗しました', { position: 'top-center' });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [liveId, tenantId]);

  const recordLabel = '回答';
  const tableColumns = useMemo(() => collectColumns(config, 'admin'), [config]);
  const hasVisibleColumns = tableColumns.length > 0;
  const {
    searchQuery,
    setSearchQuery,
    searchColumnId,
    setSearchColumnId,
    searchColumn,
    sort,
    toggleSort,
    visibleDetails,
    isHighlightColumn,
  } = useSubmissionTableView(details, tableColumns);

  const duplicateMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!duplicates) return map;
    for (const group of duplicates.groups) {
      if (group.dismissed) continue;
      for (const entry of group.entries) {
        const existing = map.get(entry.submissionId) ?? [];
        existing.push(group.normalizedTitle);
        map.set(entry.submissionId, existing);
      }
    }
    return map;
  }, [duplicates]);

  const refreshDuplicates = useCallback(() => {
    void runDuplicateRefresh(async () => {
      try {
        const response = await apiClient.post<SongDuplicateResponse>(`/lives/${liveId}/songs/duplicates/refresh`);
        setDuplicates(response ?? null);
        toast.success('曲かぶり検出を再実行しました', { position: 'top-center' });
      } catch {
        toast.error('曲かぶり検出の再実行に失敗しました', { position: 'top-center' });
      }
    });
  }, [liveId, runDuplicateRefresh]);

  const restoreDeletedSubmission = useCallback((id: string, deleted: PublicSettingSheetSubmissionDetailResponse | undefined) => {
    return runSubmissionAction(getSubmissionActionKey(id), async () => {
      await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/restore`, {});
      setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
      if (deleted) {
        setDetails((prev) => [deleted, ...prev]);
      }
      toast.success('バンドを復元しました', { position: 'top-center' });
    });
  }, [liveId, runSubmissionAction]);

  const handleDismiss = useCallback((normalizedTitle: string) => {
    void runDuplicateDismiss(getDuplicateActionKey(normalizedTitle), async () => {
      try {
        const response = await apiClient.post<SongDuplicateResponse>(
          `/lives/${liveId}/songs/duplicates/dismiss`,
          { normalizedTitle },
        );
        setDuplicates(response ?? null);
      } catch {
        toast.error('除外設定に失敗しました', { position: 'top-center' });
      }
    });
  }, [liveId, runDuplicateDismiss]);

  const fetchTrash = useCallback(() => {
    apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/trash`)
      .then((res) => {
        setTrashedDetails(res ?? []);
        setTrashFetched(true);
      });
  }, [liveId]);

  const handleOpenTrash = useCallback(() => {
    if (!trashFetched) fetchTrash();
    setTrashOpen(true);
  }, [trashFetched, fetchTrash]);

  const handleDeleteSubmission = useCallback((id: string) => {
    const deleted = details.find((d) => d.id === id);
    void runSubmissionAction(getSubmissionActionKey(id), async () => {
      try {
        await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/delete`, {});
        setDetails((prev) => prev.filter((d) => d.id !== id));
        if (deleted) setTrashedDetails((prev) => [deleted, ...prev]);
        toast.success('バンドを削除しました', {
          position: 'top-center',
          action: {
            label: '取り消す',
            onClick: () => {
              void restoreDeletedSubmission(id, deleted).catch(() => {
                toast.error('復元に失敗しました', { position: 'top-center' });
              });
            },
          },
        });
      } catch {
        toast.error('バンドの削除に失敗しました', { position: 'top-center' });
      }
    });
  }, [details, liveId, runSubmissionAction, restoreDeletedSubmission]);

  const handleRestoreFromTrash = useCallback((id: string) => {
    void runSubmissionAction(getSubmissionActionKey(id), async () => {
      try {
        await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/restore`, {});
        setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
        const response = await apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`);
        setDetails(response ?? []);
        toast.success('バンドを復元しました', { position: 'top-center' });
      } catch {
        toast.error('復元に失敗しました', { position: 'top-center' });
      }
    });
  }, [liveId, runSubmissionAction]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handlePurgeSubmission = useCallback((id: string) => {
    void runSubmissionAction(getSubmissionActionKey(id), async () => {
      try {
        await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/purge`, {});
        setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
        toast.success('バンドを完全に削除しました', { position: 'top-center' });
      } catch {
        toast.error('完全削除に失敗しました', { position: 'top-center' });
      }
    });
  }, [liveId, runSubmissionAction]);

  const visibleSelectedCount = useMemo(
    () => visibleDetails.reduce((acc, d) => (selectedIds.has(d.id) ? acc + 1 : acc), 0),
    [visibleDetails, selectedIds],
  );
  const allVisibleSelected = visibleDetails.length > 0 && visibleSelectedCount === visibleDetails.length;
  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const d of visibleDetails) next.delete(d.id);
      } else {
        for (const d of visibleDetails) next.add(d.id);
      }
      return next;
    });
  }, [allVisibleSelected, visibleDetails]);

  const targetIds = useCallback(() => (visibleSelectedCount > 0
    ? visibleDetails.filter((d) => selectedIds.has(d.id)).map((d) => d.id)
    : visibleDetails.map((d) => d.id)), [visibleDetails, visibleSelectedCount, selectedIds]);

  const [exportIds, setExportIds] = useState<string[] | null>(null);
  const handleClickBulkPdf = useCallback(() => {
    const ids = targetIds();
    if (ids.length === 0) {
      toast.error('対象の提出を選択してください', { position: 'top-center' });
      return;
    }
    setExportIds(ids);
  }, [targetIds]);
  const adminBlocks = useMemo(() => collectAdminBlocks(config), [config]);
  // 管理者入力を保存したら、表と詳細に出している回答もその場で差し替える
  const handleAdminSaved = useCallback((submissionId: string, answers: SettingSheetSubmissionAnswerResponse[]) => {
    const adminIds = adminBlocks.map((block) => block.id);
    setDetails((prev) => prev.map((d) => (d.id === submissionId ? applyAdminAnswers(d, adminIds, answers) : d)));
  }, [adminBlocks]);

  const openSubmissionDetail = useCallback((id: string) => {
    setSelectedSubmissionId(id);
    setIsDetailDialogOpen(true);
  }, []);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">提出情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const selectedDetail = details.find((d) => d.id === selectedSubmissionId) ?? null;
  const buildEditFormUrl = (submissionId: string) => `${window.location.origin}/public/lives/${live.publicToken}/submissions/${submissionId}`;
  
  const copyEditLink = async (submissionId: string) => {
    try {
      await navigator.clipboard.writeText(buildEditFormUrl(submissionId));
      toast.success('編集リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: 'テナント一覧', to: '/tenants' },
          { label: live.tenantName, to: `/tenants/${tenantId}/lives` },
          { label: live.name, to: `/tenants/${tenantId}/lives/${liveId}` },
          { label: '提出確認' },
        ]}
        backTo={`/tenants/${tenantId}/lives/${liveId}`}
        title="提出済みフォーム"
        description={`${live.name} / ${formatLiveDate(live.date)} / 全${details.length}件`}
        actions={(
          <>
            <TourButton steps={SUBMISSIONS_TOUR} />
            <Button
              variant="outline"
              size="sm"
              data-tour="submissions-pdf"
              onClick={handleClickBulkPdf}
              disabled={visibleDetails.length === 0}
              title={visibleSelectedCount > 0
                ? `選択中の${visibleSelectedCount}件をPDFで出力します`
                : '一覧の全件をPDFで出力します'}
            >
              <FileDown className="size-4" />
              {visibleSelectedCount > 0 ? `選択 ${visibleSelectedCount}件をPDF` : 'PDF出力'}
            </Button>
          </>
        )}
      />

      <div data-tour="submissions-duplicates">
      <SongDuplicatesPanel data={duplicates} isLoading={isDuplicateLoading} onRefresh={refreshDuplicates} onDismiss={isAdmin ? handleDismiss : undefined} isDismissing={(normalizedTitle) => isDuplicateDismissRunning(getDuplicateActionKey(normalizedTitle))} isAdmin={isAdmin} />
      </div>

      {/* テーブルの表示幅を稼ぐため、このカードだけ左右の余白を詰める */}
      <Card data-tour="submissions-list">
        <CardHeader className="px-3 sm:px-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">提出一覧</CardTitle>
              </div>
              {isAdmin && <span data-tour="submissions-trash"><TrashButton onClick={handleOpenTrash} count={trashedDetails.length} /></span>}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-8"
                  placeholder={searchColumn ? `${searchColumn.label}から検索` : 'すべての項目から検索'}
                  disabled={!hasVisibleColumns}
                />
              </div>
              <Select value={searchColumnId} onValueChange={setSearchColumnId} disabled={!hasVisibleColumns}>
                <SelectTrigger className="w-full sm:w-64" aria-label="検索対象の項目">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COLUMNS_VALUE}>すべての項目</SelectItem>
                  {tableColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>{column.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p>提出: {visibleDetails.length}件</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4">
          {!hasVisibleColumns ? (
            <p className="text-sm text-muted-foreground">「表示設定」で「管理」をONにした項目が表示されます</p>
          ) : visibleDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する提出はありません。</p>
          ) : (
            <SubmissionsTable
              columns={tableColumns}
              details={visibleDetails}
              selectedIds={selectedIds}
              allSelected={allVisibleSelected}
              onToggleSelectAll={toggleSelectAllVisible}
              onToggleSelect={toggleSelectOne}
              onRowClick={openSubmissionDetail}
              duplicateMap={duplicateMap}
              isAdmin={isAdmin}
              onDelete={handleDeleteSubmission}
              isDeleting={(id) => isSubmissionActionRunning(getSubmissionActionKey(id))}
              sort={sort}
              onToggleSort={toggleSort}
              searchQuery={searchQuery}
              isHighlightColumn={isHighlightColumn}
              liveId={liveId}
              adminBlocks={isAdmin ? adminBlocks : []}
              onAdminSaved={handleAdminSaved}
            />
          )}
        </CardContent>
      </Card>
      <SubmissionDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        detail={selectedDetail}
        config={config}
        recordLabel={recordLabel}
        onCopyEditLink={copyEditLink}
        onOpenPdfPreview={(submissionId) => setExportIds([submissionId])}
        adminAnswers={isAdmin ? { liveId, blocks: adminBlocks, onSaved: handleAdminSaved } : undefined}
      />

      <PdfExportDialog tenantId={tenantId} liveId={liveId} submissionIds={exportIds} onClose={() => setExportIds(null)} />

      <TrashSheet
        open={trashOpen}
        onOpenChange={setTrashOpen}
        items={trashedDetails.map((d) => ({ id: d.id, label: d.recordLabel }))}
        onRestore={handleRestoreFromTrash}
        onPurge={handlePurgeSubmission}
        entityLabel="バンド"
        isPending={(id) => isSubmissionActionRunning(getSubmissionActionKey(id))}
      />
    </div>
  );
};

