import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
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
import { apiClient } from '@/lib/api/client';
import {
  canContainBlocks,
  normalizeSettingSheetConfig,
  type LiveResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '../types/live-types';

interface VisibilityTarget {
  id: string;
  label: string;
  path: string;
  type: SettingSheetBlock['type'];
  publicVisible: boolean;
  hidden: boolean;
  typeLabel: string;
}

export const LiveVisibilitySettingsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!liveId) return;

    Promise.all([
      apiClient.get<LiveResponse>(`/lives/${liveId}`),
      apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
    ])
      .then(([liveRes, configRes]) => {
        if (liveRes) setLive(liveRes);
        if (configRes) setConfig(normalizeSettingSheetConfig(configRes));
      })
      .catch(() => {
        toast.error('情報の取得に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId]);

  if (!tenantId || !liveId) return <Navigate to="/tenants" replace />;

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>;
  }

  if (!live) return <Navigate to={`/tenants/${tenantId}/lives`} replace />;

  const visibilityTargets = config ? flattenVisibilityTargets(config.blocks) : [];
  const filteredTargets = visibilityTargets.filter((target) => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return true;
    return target.label.toLowerCase().includes(query) || target.path.toLowerCase().includes(query);
  });
  const publicVisibleCount = visibilityTargets.filter((t) => t.publicVisible).length;
  const visibleInFormCount = visibilityTargets.filter((t) => !t.hidden).length;

  const updateTargetVisibility = (blockId: string, field: 'publicVisible' | 'hidden', nextValue: boolean) => {
    setConfig((current) => {
      if (!current) return current;
      return { ...current, blocks: updateBlockVisibilityTree(current.blocks, blockId, field, nextValue) };
    });
  };

  const togglePublicSubmissionEnabled = (nextValue: boolean) => {
    setConfig((current) => (current ? { ...current, publicSubmissionEnabled: nextValue } : current));
  };

  const saveVisibility = () => {
    if (!config) return;
    setIsSaving(true);
    apiClient
      .post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, config)
      .then((response) => {
        if (response) setConfig(normalizeSettingSheetConfig(response));
        toast.success('表示設定を保存しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('表示設定の保存に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsSaving(false);
      });
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
            <BreadcrumbPage>表示設定</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold sm:text-2xl">公開・非表示設定</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">フォームや共有ページでの項目表示を切り替えます。</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">ダッシュボードに</span>戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">提出済みデータを公開する</p>
              <p className="text-xs text-muted-foreground">共有用提出確認一覧をまとめて公開します。</p>
            </div>
            <Switch checked={config?.publicSubmissionEnabled === true} onCheckedChange={togglePublicSubmissionEnabled} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryBlock label="対象項目" value={`${visibilityTargets.length}`} />
            <SummaryBlock label="共有表示中" value={`${publicVisibleCount}`} />
            <SummaryBlock label="フォーム表示中" value={`${visibleInFormCount}`} />
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} className="pl-9" placeholder="項目名で絞り込み" />
          </div>

          {visibilityTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">表示対象の項目がありません。</p>
          ) : filteredTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する項目がありません。</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <ScrollArea className="h-[440px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="min-w-[120px]">項目</TableHead>
                      <TableHead className="hidden min-w-[200px] sm:table-cell">階層</TableHead>
                      <TableHead className="hidden min-w-[80px] md:table-cell">種別</TableHead>
                      <TableHead className="w-[80px] text-center sm:w-[100px]">共有に表示</TableHead>
                      <TableHead className="w-[80px] text-center sm:w-[100px]">フォームに表示</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTargets.map((target) =>
                      (
                        <TableRow key={target.id}>
                          <TableCell className="whitespace-normal">
                            <p className="font-medium">{target.label}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{target.path}</p>
                          </TableCell>
                          <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">{target.path}</TableCell>
                          <TableCell className="hidden md:table-cell">{target.typeLabel}</TableCell>
                          {!canContainBlocks(target.type) ? (
                            <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Switch checked={target.publicVisible} onCheckedChange={(checked) => updateTargetVisibility(target.id, 'publicVisible', checked)} />
                                </div>
                            </TableCell>                        
                          ) : <TableCell></TableCell>}
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Switch checked={!target.hidden} onCheckedChange={(checked) => updateTargetVisibility(target.id, 'hidden', !checked)} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground sm:text-xs">共有に表示は公開共有ページ、フォームに表示は回答フォーム側の表示状態です。</p>
            <Button onClick={saveVisibility} disabled={isSaving} className="shrink-0">
              {isSaving ? '保存中...' : '設定を保存する'}
            </Button>
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
    if (block.type !== 'SECTION') {
      targets.push({
        id: block.id,
        label: block.label,
        path,
        type: block.type,
        publicVisible: block.publicVisible === true,
        hidden: block.hidden === true,
        typeLabel: resolveTypeLabel(block.type),
      });
    }
    if (block.fields.length > 0) {
      targets.push(...flattenVisibilityTargets(block.fields, path));
    }
    if (block.variants?.length) {
      for (const variant of block.variants) {
        const variantPath = `${path} / ${variant.label}`;
        targets.push(...flattenVisibilityTargets(variant.fields, variantPath));
      }
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
      if (childUpdated) nextBlock = { ...nextBlock, fields: nextFields };
    }

    if (block.variants?.length) {
      for (let vi = 0; vi < block.variants.length; vi++) {
        const variant = block.variants[vi];
        const [nextVFields, vUpdated] = updateBlockVisibilityTreeInternal(variant.fields, blockId, field, nextValue);
        if (vUpdated) {
          const nextVariants = [...(nextBlock.variants ?? [])];
          nextVariants[vi] = { ...variant, fields: nextVFields };
          nextBlock = { ...nextBlock, variants: nextVariants };
          fieldsUpdated = true;
        }
      }
    }

    if (block.id === blockId) {
      if (nextBlock[field] !== nextValue) nextBlock = { ...nextBlock, [field]: nextValue };
      updated = true;
    } else if (fieldsUpdated) {
      updated = true;
    }

    if (result !== null) {
      result.push(nextBlock);
    } else if (nextBlock !== block) {
      result = blocks.slice(0, i);
      result.push(nextBlock);
    }
  }

  if (result === null) return [blocks, false];
  return [result, updated];
}

function resolveTypeLabel(type: SettingSheetBlock['type']) {
  switch (type) {
    case 'SECTION': return 'セクション';
    case 'SHORT_TEXT': return '短文';
    case 'LONG_TEXT': return '長文';
    case 'SINGLE_SELECT': return '単一選択';
    case 'MULTI_SELECT': return '複数選択';
    case 'CHECKBOX': return 'チェック';
    case 'BOOLEAN': return '真偽';
    case 'REPEATABLE_GROUP': return '繰返し';
  }
  return "";
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
