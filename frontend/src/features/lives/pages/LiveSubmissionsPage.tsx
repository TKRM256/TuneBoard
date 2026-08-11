/** Live submissions list with detail dialog and song duplicate detection. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, FileDown, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageScrollTable } from '@/components/original/PageScrollTable';
import { apiClient } from '@/lib/api/client';
import type { TenantsResponse } from '@/features/tenants/types/tenant-types';
import {
  formatLiveDate,
  type LiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetConfigResponse,
  type SongDuplicateResponse,
} from '../types/live-types';
import { SongDuplicatesPanel } from '../components/SongDuplicatesPanel';
import { SubmissionDetailDialog } from '../components/SubmissionDetailDialog';
import { collectColumns, extractCellValue } from '../helpers/submission-table-helpers';
import { TrashButton, TrashSheet } from '@/components/original/TrashSheet';
import { useKeyedSingleFlight, useSingleFlight } from '@/hooks/use-single-flight';
import { useIsMobile } from '@/hooks/use-mobile';

const getSubmissionActionKey = (id: string) => `submission:${id}`;
const getDuplicateActionKey = (normalizedTitle: string) => `duplicate:${normalizedTitle}`;

export const LiveSubmissionsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const isMobile = useIsMobile();

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
  const tableColumns = useMemo(() => collectColumns(config), [config]);
  const hasVisibleColumns = tableColumns.length > 0;

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

  const openSinglePdfPreview = useCallback((submissionId: string) => {
    if (!tenantId || !liveId) return;
    const suffix = isMobile ? 'pdf-preview-mobile' : 'pdf-preview';
    navigate(`/tenants/${tenantId}/lives/${liveId}/submissions/${submissionId}/${suffix}`);
  }, [tenantId, liveId, navigate, isMobile]);

  const openBulkPdfPreview = useCallback((ids: string[]) => {
    if (!tenantId || !liveId) return;
    if (ids.length === 0) {
      toast.error('対象の提出を選択してください', { position: 'top-center' });
      return;
    }
    const suffix = isMobile ? 'pdf-preview-mobile' : 'pdf-preview';
    navigate(`/tenants/${tenantId}/lives/${liveId}/submissions/${suffix}?ids=${ids.join(',')}`);
  }, [tenantId, liveId, navigate, isMobile]);

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

  const filteredDetails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return details;
    }
    return details.filter((detail) => {
      return tableColumns.some((column) => {
        const value = extractCellValue(detail.answers, column.path, column.type);
        return value.toLowerCase().includes(query);
      });
    });
  }, [searchQuery, details, tableColumns]);

  const filteredSelectedCount = useMemo(
    () => filteredDetails.reduce((acc, d) => (selectedIds.has(d.id) ? acc + 1 : acc), 0),
    [filteredDetails, selectedIds],
  );
  const allFilteredSelected = filteredDetails.length > 0 && filteredSelectedCount === filteredDetails.length;
  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const d of filteredDetails) next.delete(d.id);
      } else {
        for (const d of filteredDetails) next.add(d.id);
      }
      return next;
    });
  }, [allFilteredSelected, filteredDetails]);

  const handleClickBulkPdf = useCallback(() => {
    const ids = filteredSelectedCount > 0
      ? filteredDetails.filter((d) => selectedIds.has(d.id)).map((d) => d.id)
      : filteredDetails.map((d) => d.id);
    openBulkPdfPreview(ids);
  }, [filteredDetails, filteredSelectedCount, selectedIds, openBulkPdfPreview]);

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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tenants">テナント一覧</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/tenants/${tenantId}/lives`}>{live.tenantName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>{live.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>提出確認</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold sm:text-2xl">提出済みフォーム</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">{live.name} / {formatLiveDate(live.date)} / 全{details.length}件</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClickBulkPdf}
                disabled={filteredDetails.length === 0}
                title={filteredSelectedCount > 0
                  ? `選択中の${filteredSelectedCount}件をPDFで出力します`
                  : '一覧の全件をPDFで出力します'}
              >
                <FileDown className="size-4" />
                {filteredSelectedCount > 0 ? `選択 ${filteredSelectedCount}件をPDF` : 'PDF一括出力'}
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                  <ChevronLeft className="size-4" />
                  戻る
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <SongDuplicatesPanel data={duplicates} isLoading={isDuplicateLoading} onRefresh={refreshDuplicates} onDismiss={isAdmin ? handleDismiss : undefined} isDismissing={(normalizedTitle) => isDuplicateDismissRunning(getDuplicateActionKey(normalizedTitle))} isAdmin={isAdmin} />

      {/* テーブル幅までカードを広げて、横方向はブラウザのスクロールに任せる */}
      <Card className="w-fit min-w-full">
        <CardHeader>
          {/* カードが画面より広くなっても操作部は左端に留める */}
          <div className="sticky left-0 max-w-[calc(100vw-2rem)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">提出一覧</CardTitle>
              </div>
              {isAdmin && <TrashButton onClick={handleOpenTrash} count={trashedDetails.length} />}
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-8" disabled={!hasVisibleColumns} />
            </div>
            <div>
              <p>提出: {filteredDetails.length}件</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasVisibleColumns ? (
            <p className="text-sm text-muted-foreground">「共有に表示」をONにした項目だけがここに表示されます</p>
          ) : filteredDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する提出はありません。</p>
          ) : (
            <div className="rounded-lg border">
                <PageScrollTable>
                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow>
                      <TableHead className="bg-background w-10">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={() => toggleSelectAllFiltered()}
                          aria-label="表示中の全提出を選択"
                        />
                      </TableHead>
                      {tableColumns.map((column) => (
                        <TableHead key={column.id} className="min-w-[150px] whitespace-normal bg-background">{column.label}</TableHead>
                      ))}
                      {duplicateMap.size > 0 && (
                        <TableHead className="whitespace-nowrap bg-background text-center">曲かぶり</TableHead>
                      )}
                      {isAdmin && <TableHead className="bg-background w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetails.map((detail) => (
                      <TableRow
                        key={detail.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedSubmissionId(detail.id); setIsDetailDialogOpen(true); }}
                      >
                        <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(detail.id)}
                            onCheckedChange={() => toggleSelectOne(detail.id)}
                            aria-label="この提出を選択"
                          />
                        </TableCell>
                        {tableColumns.map((column) => (
                          <TableCell key={`${detail.id}-${column.id}`} className="min-w-[150px] whitespace-pre-line align-top text-sm">
                            {extractCellValue(detail.answers, column.path, column.type)}
                          </TableCell>
                        ))}
                        {duplicateMap.size > 0 && (
                          <TableCell className="whitespace-nowrap text-center align-top">
                            {duplicateMap.has(detail.id) && (
                              <Badge variant="destructive" className="text-xs">
                                {duplicateMap.get(detail.id)!.length}曲
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell className="align-top">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSubmission(detail.id); }}
                              disabled={isSubmissionActionRunning(getSubmissionActionKey(detail.id))}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </PageScrollTable>
            </div>
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
        onOpenPdfPreview={openSinglePdfPreview}
      />

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

