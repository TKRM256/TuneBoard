import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, Copy, ExternalLink, FileCheck2, Link2, MapPin, Search, Settings2, Wrench } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  buildPublicLiveUrl,
  formatDeadline,
  formatLiveDate,
  formatOptionalText,
  LIVE_STATUS_LABELS,
  normalizeSettingSheetConfig,
  type LiveResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from './types/type';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';

interface VisibilityTarget {
  id: string;
  label: string;
  path: string;
  type: SettingSheetBlock['type'];
  publicVisible: boolean;
  hidden: boolean;
  typeLabel: string;
}

export const LiveManagementPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!liveId) {
      return;
    }

    apiClient.get<LiveResponse>(`/lives/${liveId}`)
      .then((liveResponse) => {
        if (liveResponse) {
          setLive(liveResponse);
        }
        return apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`);
      })
      .then((configResponse) => {
        if (configResponse) {
          setConfig(normalizeSettingSheetConfig(configResponse));
        }
      })
      .catch(() => {
        toast.error('ライブ情報の取得に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">ライブ情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const publicUrl = buildPublicLiveUrl(live.publicToken);
  const publicSubmissionListUrl = `${window.location.origin}/public/lives/${live.publicToken}/submissions/shared`;
  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';
  const visibilityTargets = config ? flattenVisibilityTargets(config.blocks) : [];
  const filteredTargets = visibilityTargets.filter((target) => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return target.label.toLowerCase().includes(query) || target.path.toLowerCase().includes(query);
  });
  const publicVisibleCount = visibilityTargets.filter((target) => target.publicVisible).length;
  const visibleInFormCount = visibilityTargets.filter((target) => !target.hidden).length;

  const updateTargetVisibility = (blockId: string, field: 'publicVisible' | 'hidden', nextValue: boolean) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        blocks: updateBlockVisibilityTree(current.blocks, blockId, field, nextValue),
      };
    });
  };

  const togglePublicSubmissionEnabled = (nextValue: boolean) => {
    setConfig((current) => (current ? { ...current, publicSubmissionEnabled: nextValue } : current));
  };

  const saveVisibility = () => {
    if (!config) {
      return;
    }
    setIsSavingVisibility(true);
    apiClient.post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, config)
      .then((response) => {
        if (response) {
          setConfig(normalizeSettingSheetConfig(response));
        }
        toast.success('公開共有の表示項目を更新しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('公開共有の表示項目更新に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsSavingVisibility(false);
      });
  };

  const copySharedListLink = async () => {
    try {
      await navigator.clipboard.writeText(publicSubmissionListUrl);
      toast.success('共有一覧リンクをコピーしました', { position: 'top-center' });
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{live.name}</h1>
                <Badge variant={badgeVariant}>{LIVE_STATUS_LABELS[live.status]}</Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to={`/tenants/${tenantId}/lives`}>
                <ChevronLeft className="size-4" />
                ライブ一覧へ戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
              <CalendarDays className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">開催日</p>
                <p className="font-medium">{formatLiveDate(live.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
              <MapPin className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">会場</p>
                <p className="font-medium">{formatOptionalText(live.location)}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border px-4 py-3">
              <p className="text-sm text-muted-foreground">回答締切</p>
              <p className="font-medium">{formatDeadline(live.deadlineAt)}</p>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <p className="text-sm text-muted-foreground">公開URL</p>
              <p className="break-all font-medium">{publicUrl}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5" />
            <h2 className="text-lg font-semibold">ライブ管理</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>フォーム構成は別ページのビルダーで自由に組み立てます。現在の高機能バンド申請フォームもテンプレートとして適用できます。</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Link2 className="size-4" />
                公開フォームを開く
              </a>
            </Button>
            <Button asChild>
              <Link to={`/tenants/${tenantId}/lives/${liveId}/form`}>
                <Wrench className="size-4" />
                ライブフォーム作成
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={`/tenants/${tenantId}/lives/${liveId}/submissions`}>
                <FileCheck2 className="size-4" />
                提出確認
              </Link>
            </Button>
            {config?.publicSubmissionEnabled === true ? (
              <Button asChild variant="outline">
                <a href={publicSubmissionListUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  共有提出一覧を開く
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ExternalLink className="size-4" />
                共有提出一覧を開く
              </Button>
            )}
            <Button variant="outline" onClick={copySharedListLink} disabled={config?.publicSubmissionEnabled !== true}>
              <Copy className="size-4" />
              共有提出一覧リンクをコピー
            </Button>
          </div>
          {config?.publicSubmissionEnabled !== true ? <p className="text-xs text-muted-foreground">共有提出一覧は現在非公開です。下の「提出済みデータを公開する」をONにすると利用できます。</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">公開・非表示設定</h2>
            <p className="text-sm text-muted-foreground">項目一覧から必要なものだけを切り替えます。変更は保存するまで反映されません。</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-lg border">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <p className="text-sm font-medium">提出済みデータを公開する</p>
                  <p className="text-xs text-muted-foreground">共有用提出確認一覧をまとめて公開します。</p>
                </div>
                <Switch checked={config?.publicSubmissionEnabled === true} onCheckedChange={togglePublicSubmissionEnabled} />
              </div>
              <div className="grid gap-3 px-4 py-3 sm:grid-cols-3">
                <SummaryBlock label="対象項目" value={`${visibilityTargets.length}`} />
                <SummaryBlock label="共有表示中" value={`${publicVisibleCount}`} />
                <SummaryBlock label="フォーム表示中" value={`${visibleInFormCount}`} />
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} className="pl-9" placeholder="項目名で絞り込み" />
            </div>
          </div>

          {visibilityTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">表示対象の項目がありません。</p>
          ) : filteredTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する項目がありません。</p>
          ) : (
            <div className="rounded-lg border">
              <ScrollArea className="h-[440px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-[220px]">項目</TableHead>
                      <TableHead className="w-[280px]">階層</TableHead>
                      <TableHead className="w-[120px]">種別</TableHead>
                      <TableHead className="w-[140px] text-center">共有に表示</TableHead>
                      <TableHead className="w-[140px] text-center">フォームに表示</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTargets.map((target) => (
                      <TableRow key={target.id}>
                        <TableCell className="whitespace-normal">
                          <p className="font-medium">{target.label}</p>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">{target.path}</TableCell>
                        <TableCell>{target.typeLabel}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Switch checked={target.publicVisible} onCheckedChange={(checked) => updateTargetVisibility(target.id, 'publicVisible', checked)} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Switch checked={!target.hidden} onCheckedChange={(checked) => updateTargetVisibility(target.id, 'hidden', !checked)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">共有に表示は公開共有ページ、フォームに表示は回答フォーム側の表示状態です。</p>
            <Button onClick={saveVisibility} disabled={isSavingVisibility}>{isSavingVisibility ? '保存中...' : '設定を保存する'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function flattenVisibilityTargets(blocks: SettingSheetBlock[], parentLabel = '') {
  const targets: VisibilityTarget[] = [];
  for (const block of blocks) {
    const path = parentLabel ? `${parentLabel} / ${block.label}` : block.label;
    targets.push({
      id: block.id,
      label: block.label,
      path,
      type: block.type,
      publicVisible: block.publicVisible === true,
      hidden: block.hidden === true,
      typeLabel: resolveTypeLabel(block.type),
    });
    if (block.fields.length > 0) {
      targets.push(...flattenVisibilityTargets(block.fields, path));
    }
  }
  return targets;
}

function updateBlockVisibilityTree(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: 'publicVisible' | 'hidden',
  nextValue: boolean,
): SettingSheetBlock[] {
  const [nextBlocks] = updateBlockVisibilityTreeInternal(blocks, blockId, field, nextValue);
  return nextBlocks;
}

function updateBlockVisibilityTreeInternal(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: 'publicVisible' | 'hidden',
  nextValue: boolean,
): [SettingSheetBlock[], boolean] {
  let updated = false;
  let result: SettingSheetBlock[] | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    let nextBlock = block;
    let fieldsUpdated = false;

    if (block.fields.length > 0) {
      const [nextFields, childUpdated] = updateBlockVisibilityTreeInternal(block.fields, blockId, field, nextValue);
      fieldsUpdated = childUpdated;
      if (childUpdated) {
        nextBlock = { ...nextBlock, fields: nextFields };
      }
    }

    if (block.id === blockId) {
      if (nextBlock[field] !== nextValue) {
        nextBlock = { ...nextBlock, [field]: nextValue };
      }
      updated = true;
    } else if (fieldsUpdated) {
      updated = true;
    }

    if (result !== null) {
      // すでにどこかで変更が発生しているので、新しい配列にプッシュする
      result.push(nextBlock);
    } else if (nextBlock !== block) {
      // ここで初めて変更が発生したので、先頭〜直前までをコピーして新配列を作る
      result = blocks.slice(0, i);
      result.push(nextBlock);
    }
  }

  if (result === null) {
    // 1件も変更がなければ元の配列参照をそのまま返す
    return [blocks, false];
  }

  return [result, updated];
}

function resolveTypeLabel(type: SettingSheetBlock['type']) {
  switch (type) {
    case 'SECTION':
      return 'セクション';
    case 'SHORT_TEXT':
      return '短文';
    case 'LONG_TEXT':
      return '長文';
    case 'SINGLE_SELECT':
      return '単一選択';
    case 'MULTI_SELECT':
      return '複数選択';
    case 'CHECKBOX':
      return 'チェック';
    case 'BOOLEAN':
      return '真偽';
    case 'REPEATABLE_GROUP':
      return '繰返し';
  }
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}