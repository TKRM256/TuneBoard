import { type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, ExternalLink, FileCheck2, Settings2, Wrench } from 'lucide-react';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import type { TenantsResponse } from '@/features/tenants/types/tenant-types';
import {
  buildPublicLiveUrl,
  formatLiveDate,
  formatOptionalText,
  LIVE_STATUS_LABELS,
  normalizeSettingSheetConfig,
  type LiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetConfigResponse,
  type SongDuplicateResponse,
} from '../types/live-types';
import { LiveInfoCard } from '../components/LiveInfoCard';
import { LiveSummaryCard } from '../components/LiveSummaryCard';
import { SubmissionDetailDialog } from '../components/SubmissionDetailDialog';

export const LiveManagementPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [duplicates, setDuplicates] = useState<SongDuplicateResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveId || !tenantId) return;

    Promise.all([
      apiClient.get<LiveResponse>(`/lives/${liveId}`),
      apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
      apiClient.get<SongDuplicateResponse>(`/lives/${liveId}/songs/duplicates`),
      apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`),
      apiClient.get<TenantsResponse>(`/tenants/get/${tenantId}`),
    ])
      .then(([liveRes, configRes, dupRes, detailsRes, tenantRes]) => {
        if (liveRes) setLive(liveRes);
        if (configRes) setConfig(normalizeSettingSheetConfig(configRes));
        setDuplicates(dupRes ?? null);
        setDetails(detailsRes ?? []);
        if (tenantRes) setIsAdmin(tenantRes.role === 'ADMIN' || tenantRes.role === 'OWNER');
      })
      .catch(() => {
        toast.error('ライブ情報の取得に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId, tenantId]);

  if (!tenantId || !liveId) return <Navigate to="/tenants" replace />;
  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!live) return <Navigate to={`/tenants/${tenantId}/lives`} replace />;

  const publicUrl = buildPublicLiveUrl(live.publicToken);
  const sharedListUrl = `${window.location.origin}/public/lives/${live.publicToken}/submissions/shared`;
  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';
  const selectedDetail = details.find((d) => d.id === selectedSubmissionId) ?? null;
  const buildEditFormUrl = (submissionId: string) => `${window.location.origin}/public/lives/${live.publicToken}/submissions/${submissionId}`;

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('公開URLをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('コピーに失敗しました', { position: 'top-center' });
    }
  };

  const copySharedListLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedListUrl);
      toast.success('共有一覧リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('コピーに失敗しました', { position: 'top-center' });
    }
  };

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
            <BreadcrumbPage>{live.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold sm:text-2xl">{live.name}</h1>
                <Badge variant={badgeVariant}>{LIVE_STATUS_LABELS[live.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">{formatLiveDate(live.date)} · {formatOptionalText(live.location)}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to={`/tenants/${tenantId}/lives`}>
                <ChevronLeft className="size-4" />
                戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* リンク */}
      <Card>
        <CardContent className="space-y-2 pt-4">
          <LinkRow label="公開フォーム" url={publicUrl} onCopy={copyPublicUrl} />
          {config?.publicSubmissionEnabled === true ? (
            <LinkRow label="共有提出一覧" url={sharedListUrl} onCopy={copySharedListLink} />
          ) : (
            <p className="text-xs text-muted-foreground">※ 提出共有は非公開中です。表示設定から変更できます。</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {isAdmin && <QuickActionLink icon={<Wrench className="size-5" />} label="フォーム編集" to={`/tenants/${tenantId}/lives/${liveId}/form`} />}
        <QuickActionLink icon={<FileCheck2 className="size-5" />} label="提出確認" to={`/tenants/${tenantId}/lives/${liveId}/submissions`} />
        {isAdmin && <QuickActionLink icon={<Settings2 className="size-5" />} label="表示設定" to={`/tenants/${tenantId}/lives/${liveId}/settings`} />}
      </div>

      {/* Live Info */}
      <LiveInfoCard live={live} isAdmin={isAdmin} onUpdated={setLive} />

      {/* Summary */}
      <LiveSummaryCard
        details={details}
        duplicates={duplicates}
        submissionsPath={`/tenants/${tenantId}/lives/${liveId}/submissions`}
        onSelectSubmission={(submissionId) => {
          setSelectedSubmissionId(submissionId);
          setIsDetailDialogOpen(true);
        }}
      />

      <SubmissionDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        detail={selectedDetail}
        config={config}
        recordLabel="回答"
        onCopyEditLink={copyEditLink}
      />
    </div>
  );
};

function QuickActionLink({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-card px-2 py-4 text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function LinkRow({ label, url, onCopy }: { label: string; url: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="shrink-0 font-medium">{label}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{url}</span>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onCopy} title="URLをコピー">
        <Copy className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild title="新しいタブで開く">
        <a href={url} target="_blank" rel="noreferrer">
          <ExternalLink className="size-3.5" />
        </a>
      </Button>
    </div>
  );
}

