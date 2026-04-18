/** Live submissions list with detail dialog and song duplicate detection. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft,Search, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export const LiveSubmissionsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<SongDuplicateResponse | null>(null);
  const [isDuplicateLoading, setIsDuplicateLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trashedDetails, setTrashedDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashFetched, setTrashFetched] = useState(false);

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

  const refreshDuplicates = useCallback(async () => {
    setIsDuplicateLoading(true);
    try {
      const response = await apiClient.post<SongDuplicateResponse>(`/lives/${liveId}/songs/duplicates/refresh`);
      setDuplicates(response ?? null);
      toast.success('曲かぶり検出を再実行しました', { position: 'top-center' });
    } catch {
      toast.error('曲かぶり検出の再実行に失敗しました', { position: 'top-center' });
    } finally {
      setIsDuplicateLoading(false);
    }
  }, [liveId]);

  const handleDismiss = useCallback(async (normalizedTitle: string) => {
    try {
      const response = await apiClient.post<SongDuplicateResponse>(
        `/lives/${liveId}/songs/duplicates/dismiss`,
        { normalizedTitle },
      );
      setDuplicates(response ?? null);
    } catch {
      toast.error('除外設定に失敗しました', { position: 'top-center' });
    }
  }, [liveId]);

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
    apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/delete`, {}).then(() => {
      setDetails((prev) => prev.filter((d) => d.id !== id));
      if (deleted) setTrashedDetails((prev) => [deleted, ...prev]);
      toast.success('バンドを削除しました', {
        position: 'top-center',
        action: {
          label: '取り消す',
          onClick: () => {
            apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/restore`, {}).then(() => {
              setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
              if (deleted) setDetails((prev) => [deleted, ...prev]);
              toast.success('バンドを復元しました', { position: 'top-center' });
            }).catch(() => {
              toast.error('復元に失敗しました', { position: 'top-center' });
            });
          },
        },
      });
    }).catch(() => {
      toast.error('バンドの削除に失敗しました', { position: 'top-center' });
    });
  }, [details, liveId]);

  const handleRestoreFromTrash = useCallback((id: string) => {
    apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/restore`, {}).then(() => {
      setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
      // answers フィールドのない trash アイテムを直接 details に戻すとクラッシュするため再取得する
      apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`)
        .then((res) => setDetails(res ?? []));
      toast.success('バンドを復元しました', { position: 'top-center' });
    }).catch(() => {
      toast.error('復元に失敗しました', { position: 'top-center' });
    });
  }, [liveId]);

  const handlePurgeSubmission = useCallback((id: string) => {
    apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/purge`, {}).then(() => {
      setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
      toast.success('バンドを完全に削除しました', { position: 'top-center' });
    }).catch(() => {
      toast.error('完全削除に失敗しました', { position: 'top-center' });
    });
  }, [liveId]);

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
            <div className="flex items-center gap-2">
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

      <SongDuplicatesPanel data={duplicates} isLoading={isDuplicateLoading} onRefresh={refreshDuplicates} onDismiss={isAdmin ? handleDismiss : undefined} isAdmin={isAdmin} />

      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">提出一覧</CardTitle>
              </div>
              {isAdmin && <TrashButton onClick={handleOpenTrash} count={trashedDetails.length} />}
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-8" placeholder="公開項目で検索" disabled={!hasVisibleColumns} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasVisibleColumns ? (
            <p className="text-sm text-muted-foreground">「共有に表示」をONにした項目だけがここに表示されます</p>
          ) : filteredDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する提出はありません。</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow>
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
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
      />

      <TrashSheet
        open={trashOpen}
        onOpenChange={setTrashOpen}
        items={trashedDetails.map((d) => ({ id: d.id, label: d.recordLabel }))}
        onRestore={handleRestoreFromTrash}
        onPurge={handlePurgeSubmission}
        entityLabel="バンド"
      />
    </div>
  );
};

