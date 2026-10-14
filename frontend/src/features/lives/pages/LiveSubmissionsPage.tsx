/** 提出確認。提出一覧と曲かぶりをタブで切り替え、提出を押すと一覧の上に詳細を開く。 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
import { SongDuplicatesPanel } from '../components/SongDuplicatesPanel';
import { SubmissionDetailDialog } from '../components/SubmissionDetailDialog';
import { SubmissionsListCard } from '../components/SubmissionsListCard';
import { collectColumns } from '../helpers/submission-table-helpers';
import { useSubmissionTableView } from '../hooks/use-submission-table-view';
import { useSubmissionTrash } from '../hooks/use-submission-trash';
import { TrashSheet } from '@/components/original/TrashSheet';
import { TourButton } from '@/features/tutorial/TourButton';
import { SUBMISSIONS_TOUR } from '@/features/tutorial/tours/submissions-tour';
import { useKeyedSingleFlight, useSingleFlight } from '@/hooks/use-single-flight';

const getDuplicateActionKey = (normalizedTitle: string) => `duplicate:${normalizedTitle}`;
const DETAIL_PARAM = 'submission';
type SubmissionsTab = 'list' | 'duplicates';

export const LiveSubmissionsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SubmissionsTab>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<SongDuplicateResponse | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { isRunning: isDuplicateLoading, run: runDuplicateRefresh } = useSingleFlight();
  const { run: runDuplicateDismiss, isRunning: isDuplicateDismissRunning } = useKeyedSingleFlight<string>();
  const trash = useSubmissionTrash(liveId, details, setDetails);
  const { trashedDetails, trashOpen, setTrashOpen, handleOpenTrash, handleDeleteSubmission, handleRestoreFromTrash, handlePurgeSubmission } = trash;

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

  const tableColumns = useMemo(() => collectColumns(config, 'admin'), [config]);
  const {
    searchQuery,
    setSearchQuery,
    searchColumnId,
    setSearchColumnId,
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

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

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

  // 出力は PDF 書式の画面で、書式を選んでそのまま保存する
  const openExport = useCallback((ids: string[]) => {
    navigate(`/tenants/${tenantId}/lives/${liveId}/pdf-layouts?ids=${ids.join(',')}`);
  }, [navigate, tenantId, liveId]);
  const handleClickBulkPdf = useCallback(() => {
    const ids = targetIds();
    if (ids.length === 0) {
      toast.error('対象の提出を選択してください', { position: 'top-center' });
      return;
    }
    openExport(ids);
  }, [targetIds, openExport]);
  const adminBlocks = useMemo(() => collectAdminBlocks(config), [config]);
  // 管理者入力を保存したら、表と詳細に出している回答もその場で差し替える
  const handleAdminSaved = useCallback((submissionId: string, answers: SettingSheetSubmissionAnswerResponse[]) => {
    const adminIds = adminBlocks.map((block) => block.id);
    setDetails((prev) => prev.map((d) => (d.id === submissionId ? applyAdminAnswers(d, adminIds, answers) : d)));
  }, [adminBlocks]);

  // 詳細は一覧の上に開く。URL にも残すので、スマホの戻る操作で閉じられる
  const openedId = searchParams.get(DETAIL_PARAM);
  const openedHereRef = useRef(false);
  const openSubmissionDetail = useCallback((id: string, replace = false) => {
    if (!replace) openedHereRef.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(DETAIL_PARAM, id);
      return next;
    }, { replace });
  }, [setSearchParams]);
  const closeSubmissionDetail = useCallback(() => {
    if (openedHereRef.current) {
      openedHereRef.current = false;
      navigate(-1);
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(DETAIL_PARAM);
      return next;
    }, { replace: true });
  }, [navigate, setSearchParams]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">提出情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const crumbs = [
    { label: 'テナント一覧', to: '/tenants' },
    { label: live.tenantName, to: `/tenants/${tenantId}/lives` },
    { label: live.name, to: `/tenants/${tenantId}/lives/${liveId}` },
  ];
  const openedDetail = openedId ? details.find((d) => d.id === openedId) ?? null : null;
  const copyEditLink = async (submissionId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/public/lives/${live.publicToken}/submissions/${submissionId}`);
      toast.success('編集リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };

  const detailOrder = openedDetail && visibleDetails.some((d) => d.id === openedDetail.id) ? visibleDetails : details;
  const detailIndex = openedDetail ? detailOrder.findIndex((d) => d.id === openedDetail.id) : -1;

  const duplicateCount = duplicates?.groups.filter((group) => !group.dismissed).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[...crumbs, { label: '提出確認' }]}
        backTo={`/tenants/${tenantId}/lives/${liveId}`}
        title="提出確認"
        description={`${live.name} · ${formatLiveDate(live.date)}`}
        actions={(
          <>
            <TourButton steps={SUBMISSIONS_TOUR} />
            <Button
              variant="outline"
              size="sm"
              data-tour="submissions-pdf"
              onClick={handleClickBulkPdf}
              disabled={visibleDetails.length === 0}
            >
              <FileDown className="size-4" />
              {visibleSelectedCount > 0 ? `選択 ${visibleSelectedCount}件をPDF出力` : '全件をPDF出力'}
            </Button>
          </>
        )}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as SubmissionsTab)} className="gap-4">
        <TabsList className="h-10 w-full sm:w-auto">
          <TabsTrigger value="list" className="px-4" data-tour="submissions-list-tab">
            提出一覧<span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{details.length}</span>
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="px-4" data-tour="submissions-duplicates">
            曲かぶり
            {duplicateCount > 0 ? <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[11px] font-medium text-white tabular-nums">{duplicateCount}</span> : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-0">
          <SubmissionsListCard
            columns={tableColumns}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchColumnId={searchColumnId}
            onSearchColumnChange={setSearchColumnId}
            onOpenTrash={isAdmin ? handleOpenTrash : undefined}
            trashCount={trashedDetails.length}
            table={{
              details: visibleDetails,
              selectedIds,
              allSelected: allVisibleSelected,
              onToggleSelectAll: toggleSelectAllVisible,
              onToggleSelect: toggleSelectOne,
              onRowClick: (id) => openSubmissionDetail(id),
              duplicateMap,
              isAdmin,
              onDelete: handleDeleteSubmission,
              isDeleting: (id) => trash.isSubmissionPending(id),
              sort,
              onToggleSort: toggleSort,
              isHighlightColumn,
              liveId,
              adminBlocks: isAdmin ? adminBlocks : [],
              onAdminSaved: handleAdminSaved,
            }}
          />
        </TabsContent>
        <TabsContent value="duplicates" className="mt-0">
          <SongDuplicatesPanel
            data={duplicates}
            isLoading={isDuplicateLoading}
            onRefresh={refreshDuplicates}
            onDismiss={isAdmin ? handleDismiss : undefined}
            isDismissing={(normalizedTitle) => isDuplicateDismissRunning(getDuplicateActionKey(normalizedTitle))}
            isAdmin={isAdmin}
            onSelectSubmission={(id) => openSubmissionDetail(id)}
          />
        </TabsContent>
      </Tabs>

      <SubmissionDetailDialog
        detail={openedDetail}
        index={detailIndex}
        total={detailOrder.length}
        onMove={(offset) => {
          const next = detailOrder[detailIndex + offset];
          if (next) openSubmissionDetail(next.id, true);
        }}
        onClose={closeSubmissionDetail}
        onCopyEditLink={(id) => void copyEditLink(id)}
        onExport={(id) => openExport([id])}
        config={config}
        adminAnswers={isAdmin ? { liveId, blocks: adminBlocks, onSaved: handleAdminSaved } : undefined}
      />

      <TrashSheet
        open={trashOpen}
        onOpenChange={setTrashOpen}
        items={trashedDetails.map((d) => ({ id: d.id, label: d.recordLabel }))}
        onRestore={handleRestoreFromTrash}
        onPurge={handlePurgeSubmission}
        entityLabel="バンド"
        isPending={(id) => trash.isSubmissionPending(id)}
      />
    </div>
  );
};
