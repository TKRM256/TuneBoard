/** 項目ごとの表示先（共有フォーム / 管理者画面 / 公開フォーム）を設定するページ。 */
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, Search } from 'lucide-react';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { UnsavedChangesDialog } from '@/components/original/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import {
  normalizeSettingSheetConfig,
  type LiveResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { VisibilityScopeLegend } from '../visibility/VisibilityScopeLegend';
import { VisibilityTreeRow } from '../visibility/VisibilityTreeRow';
import { toFieldValue, VISIBILITY_SCOPES, type VisibilityScope } from '../visibility/visibility-scopes';
import {
  collectCollapsibleKeys,
  countLeafBlocks,
  countVisibleLeafBlocks,
  filterBlocksByQuery,
  setAllVisibility,
  setBlockVisibility,
} from '../visibility/visibility-tree';

export const LiveVisibilitySettingsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  /** 最後に保存した内容。未保存の変更があるかの判定に使う。 */
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    Promise.all([
      apiClient.get<LiveResponse>(`/lives/${liveId}`),
      apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
    ])
      .then(([liveRes, configRes]) => {
        if (liveRes) {
          setLive(liveRes);
        }
        if (configRes) {
          const normalized = normalizeSettingSheetConfig(configRes);
          setConfig(normalized);
          setSavedSignature(JSON.stringify(normalized));
        }
      })
      .catch(() => {
        toast.error('情報の取得に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId]);

  const blocks = useMemo(() => config?.blocks ?? [], [config?.blocks]);
  const filteredBlocks = useMemo(() => filterBlocksByQuery(blocks, filterQuery), [blocks, filterQuery]);
  const isSearching = filterQuery.trim().length > 0;
  const totalLeafCount = useMemo(() => countLeafBlocks(blocks), [blocks]);
  const visibleCounts = useMemo(() => Object.fromEntries(
    VISIBILITY_SCOPES.map((scope) => [scope.key, countVisibleLeafBlocks(blocks, scope)]),
  ), [blocks]);

  const leaveGuard = useUnsavedChangesWarning(
    config !== null && savedSignature !== null && JSON.stringify(config) !== savedSignature,
  );

  const changeVisibility = (blockId: string, scope: VisibilityScope, visible: boolean) => {
    setConfig((current) => (current
      ? { ...current, blocks: setBlockVisibility(current.blocks, blockId, scope.field, toFieldValue(scope, visible)) }
      : current));
  };

  const changeAllVisibility = (scope: VisibilityScope, visible: boolean) => {
    setConfig((current) => (current
      ? { ...current, blocks: setAllVisibility(current.blocks, scope.field, toFieldValue(scope, visible)) }
      : current));
  };

  const toggleCollapsed = (key: string) => {
    setCollapsedIds((current) => ({ ...current, [key]: !current[key] }));
  };

  const expandAll = () => setCollapsedIds({});
  const collapseAll = () => setCollapsedIds(
    Object.fromEntries(collectCollapsibleKeys(blocks).map((key) => [key, true])),
  );

  const togglePublicSubmissionEnabled = (nextValue: boolean) => {
    setConfig((current) => (current ? { ...current, publicSubmissionEnabled: nextValue } : current));
  };

  const saveVisibility = () => {
    if (!config) {
      return;
    }

    setIsSaving(true);
    apiClient
      .post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, config)
      .then((response) => {
        if (response) {
          const normalized = normalizeSettingSheetConfig(response);
          setConfig(normalized);
          setSavedSignature(JSON.stringify(normalized));
        }
        toast.success('表示設定を保存しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('表示設定の保存に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const isPublicSubmissionEnabled = config?.publicSubmissionEnabled === true;
  const hasUnsavedChanges = savedSignature !== null && JSON.stringify(config) !== savedSignature;

  return (
    <div className="space-y-4 pb-20">
      <UnsavedChangesDialog guard={leaveGuard} />
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
            <BreadcrumbPage>表示設定</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold sm:text-2xl">表示設定</h1>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                <ChevronLeft className="size-4" />戻る
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">共有フォームを公開する</p>
            </div>
            <Toggle
              variant="outline"
              pressed={isPublicSubmissionEnabled}
              onPressedChange={togglePublicSubmissionEnabled}
              className={cn(
                'h-8 shrink-0 gap-1 border px-2.5 text-xs shadow-xs',
                isPublicSubmissionEnabled
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-muted-foreground',
              )}
            >
              {isPublicSubmissionEnabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              {isPublicSubmissionEnabled ? '公開中' : '非公開'}
            </Toggle>
          </div>

          <VisibilityScopeLegend
            counts={visibleCounts}
            total={totalLeafCount}
            onBulkChange={changeAllVisibility}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                className="h-9 pl-9"
                placeholder="項目名で絞り込み"
              />
            </div>
            <div className="flex gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={expandAll} disabled={isSearching}>
                <ChevronsUpDown className="size-3.5" />すべて開く
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={collapseAll} disabled={isSearching}>
                <ChevronsDownUp className="size-3.5" />すべて閉じる
              </Button>
            </div>
          </div>

          {totalLeafCount === 0 ? (
            <p className="text-sm text-muted-foreground">表示対象の項目がありません。</p>
          ) : filteredBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する項目がありません。</p>
          ) : (
            <div className="space-y-1">
              {/* 列見出し。行のトグル幅(sm:w-20)と余白を揃えている */}
              <div className="sticky top-0 z-10 hidden items-center gap-3 rounded-lg border bg-background/95 px-3 py-1.5 backdrop-blur sm:flex">
                <span className="flex-1 text-xs font-medium text-muted-foreground">項目</span>
                <div className="flex shrink-0 items-center gap-2">
                  {VISIBILITY_SCOPES.map((scope) => (
                    <span key={scope.key} className="w-20 text-center text-xs font-medium">{scope.label}</span>
                  ))}
                </div>
              </div>

              {filteredBlocks.map((block) => (
                <VisibilityTreeRow
                  key={block.id}
                  block={block}
                  parentPath=""
                  showPath={isSearching}
                  forceExpanded={isSearching}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={toggleCollapsed}
                  onChangeVisibility={changeVisibility}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 項目数が多いので保存ボタンは常に手元に置く */}
      <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-3 rounded-xl border bg-background/95 px-3 py-2 backdrop-blur">
        {hasUnsavedChanges ? (
          <p className="text-xs text-muted-foreground">未保存の変更があります</p>
        ) : null}
        <Button onClick={saveVisibility} disabled={isSaving || !hasUnsavedChanges} className="shrink-0">
          {isSaving ? '保存中...' : '設定を保存する'}
        </Button>
      </div>
    </div>
  );
};
