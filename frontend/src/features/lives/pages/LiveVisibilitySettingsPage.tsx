import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import {
  canContainBlocks,
  normalizeSettingSheetConfig,
  type LiveResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '../types/live-types';

interface VisibilityLeafTarget {
  id: string;
  publicVisible: boolean;
  hidden: boolean;
}

const toggleBaseClassName = 'h-7 px-2 text-xs gap-1 border shadow-xs transition-colors';
const sharedToggleClassName = cn(
  toggleBaseClassName,
  'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-slate-100',
  'data-[state=on]:border-emerald-300 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 data-[state=on]:hover:bg-emerald-100 data-[state=on]:hover:text-emerald-800 dark:data-[state=on]:border-emerald-700 dark:data-[state=on]:bg-emerald-950/30 dark:data-[state=on]:text-emerald-300 dark:data-[state=on]:hover:bg-emerald-950/50 dark:data-[state=on]:hover:text-emerald-200',
);
const formToggleClassName = cn(
  toggleBaseClassName,
  'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-200',
  'data-[state=on]:border-sky-300 data-[state=on]:bg-sky-50 data-[state=on]:text-sky-700 data-[state=on]:hover:bg-sky-100 data-[state=on]:hover:text-sky-800 dark:data-[state=on]:border-sky-700 dark:data-[state=on]:bg-sky-950/30 dark:data-[state=on]:text-sky-300 dark:data-[state=on]:hover:bg-sky-950/50 dark:data-[state=on]:hover:text-sky-200',
);

export const LiveVisibilitySettingsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

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
          setConfig(normalizeSettingSheetConfig(configRes));
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
  const leafTargets = useMemo(() => collectLeafTargets(blocks), [blocks]);
  const filteredBlocks = useMemo(() => filterBlocksByQuery(blocks, filterQuery), [blocks, filterQuery]);
  const isSearching = filterQuery.trim().length > 0;

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

  const toggleCollapsed = (blockId: string) => {
    setCollapsedIds((current) => ({
      ...current,
      [blockId]: !current[blockId],
    }));
  };

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
          setConfig(normalizeSettingSheetConfig(response));
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
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                <ChevronLeft className="size-4" />戻る
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">提出済みデータを公開する</p>
            </div>
            <Toggle
              variant="outline"
              pressed={config?.publicSubmissionEnabled === true}
              onPressedChange={togglePublicSubmissionEnabled}
              className={sharedToggleClassName}
            >
              {config?.publicSubmissionEnabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              {config?.publicSubmissionEnabled ? '公開中' : '非公開'}
            </Toggle>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} className="pl-9" placeholder="項目名で絞り込み" />
          </div>

          {leafTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">表示対象の項目がありません。</p>
          ) : filteredBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する項目がありません。</p>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-muted/10">
              <ScrollArea className="h-[520px]">
                <div className="space-y-3 p-4">
                  {filteredBlocks.map((block) => (
                    <VisibilityTreeNode
                      key={block.id}
                      block={block}
                      depth={0}
                      parentPath=""
                      forceExpanded={isSearching}
                      collapsedIds={collapsedIds}
                      onToggleCollapse={toggleCollapsed}
                      onToggleVisibility={updateTargetVisibility}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button onClick={saveVisibility} disabled={isSaving} className="shrink-0">
              {isSaving ? '保存中...' : '設定を保存する'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function collectLeafTargets(blocks: SettingSheetBlock[]): VisibilityLeafTarget[] {
  const targets: VisibilityLeafTarget[] = [];

  for (const block of blocks) {
    if (canContainBlocks(block.type)) {
      targets.push(...collectLeafTargets(block.fields));
      for (const variant of block.variants ?? []) {
        targets.push(...collectLeafTargets(variant.fields));
      }
      continue;
    }

    targets.push({
      id: block.id,
      publicVisible: block.publicVisible === true,
      hidden: block.hidden === true,
    });
  }

  return targets;
}

function filterBlocksByQuery(blocks: SettingSheetBlock[], rawQuery: string): SettingSheetBlock[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return blocks;
  }

  return blocks.flatMap((block) => {
    const selfMatches = [block.label, block.description, resolveTypeLabel(block.type)].some((value) => value.toLowerCase().includes(query));
    const filteredFields = selfMatches ? block.fields : filterBlocksByQuery(block.fields, query);
    const filteredVariants = (block.variants ?? []).flatMap((variant) => {
      const variantMatches = variant.label.toLowerCase().includes(query);
      const fields = selfMatches || variantMatches ? variant.fields : filterBlocksByQuery(variant.fields, query);
      return variantMatches || fields.length > 0 ? [{ ...variant, fields }] : [];
    });

    if (selfMatches || filteredFields.length > 0 || filteredVariants.length > 0) {
      return [{
        ...block,
        fields: filteredFields,
        variants: block.variants ? filteredVariants : block.variants,
      }];
    }

    return [];
  });
}

function updateBlockVisibilityTree(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: 'publicVisible' | 'hidden',
  nextValue: boolean,
): SettingSheetBlock[] {
  const [nextBlocks, updated] = updateBlockVisibilityTreeInternal(blocks, blockId, field, nextValue);
  return updated ? syncContainerStates(nextBlocks) : blocks;
}

function updateBlockVisibilityTreeInternal(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: 'publicVisible' | 'hidden',
  nextValue: boolean,
): [SettingSheetBlock[], boolean] {
  let updated = false;
  let result: SettingSheetBlock[] | null = null;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.id === blockId) {
      const nextBlock = applyVisibilityToDescendants(block, field, nextValue);
      updated = true;
      if (result !== null) {
        result.push(nextBlock);
      } else if (nextBlock !== block) {
        result = blocks.slice(0, index);
        result.push(nextBlock);
      }
      continue;
    }

    let nextBlock = block;
    let childUpdated = false;

    if (block.fields.length > 0) {
      const [nextFields, fieldsUpdated] = updateBlockVisibilityTreeInternal(block.fields, blockId, field, nextValue);
      if (fieldsUpdated) {
        nextBlock = { ...nextBlock, fields: nextFields };
        childUpdated = true;
      }
    }

    if (block.variants?.length) {
      let nextVariants = nextBlock.variants;
      for (let variantIndex = 0; variantIndex < block.variants.length; variantIndex += 1) {
        const variant = block.variants[variantIndex];
        const [nextVariantFields, variantUpdated] = updateBlockVisibilityTreeInternal(variant.fields, blockId, field, nextValue);
        if (variantUpdated) {
          nextVariants = [...(nextVariants ?? [])];
          nextVariants[variantIndex] = { ...variant, fields: nextVariantFields };
          childUpdated = true;
        }
      }
      if (nextVariants !== nextBlock.variants) {
        nextBlock = { ...nextBlock, variants: nextVariants };
      }
    }

    if (childUpdated) {
      updated = true;
    }

    if (result !== null) {
      result.push(nextBlock);
    } else if (nextBlock !== block) {
      result = blocks.slice(0, index);
      result.push(nextBlock);
    }
  }

  if (result === null) {
    return [blocks, false];
  }

  return [result, updated];
}

function applyVisibilityToDescendants(
  block: SettingSheetBlock,
  field: 'publicVisible' | 'hidden',
  nextValue: boolean,
): SettingSheetBlock {
  return {
    ...block,
    [field]: nextValue,
    fields: block.fields.map((child) => applyVisibilityToDescendants(child, field, nextValue)),
    variants: block.variants?.map((variant) => ({
      ...variant,
      fields: variant.fields.map((child) => applyVisibilityToDescendants(child, field, nextValue)),
    })),
  };
}

function syncContainerStates(blocks: SettingSheetBlock[]): SettingSheetBlock[] {
  return blocks.map((block) => {
    const fields = syncContainerStates(block.fields);
    const variants = block.variants?.map((variant) => ({
      ...variant,
      fields: syncContainerStates(variant.fields),
    }));
    const descendants = [...fields, ...(variants ?? []).flatMap((variant) => variant.fields)];

    if (!canContainBlocks(block.type) || descendants.length === 0) {
      return {
        ...block,
        fields,
        variants,
      };
    }

    return {
      ...block,
      hidden: descendants.every((child) => child.hidden === true),
      publicVisible: descendants.some((child) => child.publicVisible === true),
      fields,
      variants,
    };
  });
}

function resolveTypeLabel(type: SettingSheetBlock['type']) {
  switch (type) {
    case 'SECTION':
      return '見出し';
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
    case 'SONG':
      return '楽曲';
    case 'REPEATABLE_GROUP':
      return '繰り返し';
  }
}

function countNestedLeafTargets(block: SettingSheetBlock): number {
  if (!canContainBlocks(block.type)) {
    return 1;
  }

  return [...block.fields, ...(block.variants ?? []).flatMap((variant) => variant.fields)]
    .reduce((count, child) => count + countNestedLeafTargets(child), 0);
}

function VisibilityTreeNode({
  block,
  depth,
  parentPath,
  forceExpanded,
  collapsedIds,
  onToggleCollapse,
  onToggleVisibility,
}: {
  block: SettingSheetBlock;
  depth: number;
  parentPath: string;
  forceExpanded: boolean;
  collapsedIds: Record<string, boolean>;
  onToggleCollapse: (blockId: string) => void;
  onToggleVisibility: (blockId: string, field: 'publicVisible' | 'hidden', nextValue: boolean) => void;
}) {
  const isContainer = canContainBlocks(block.type);
  const hasChildren = block.fields.length > 0 || (block.variants ?? []).some((variant) => variant.fields.length > 0);
  const isCollapsed = !forceExpanded && collapsedIds[block.id] === true;
  const path = parentPath ? `${parentPath} / ${block.label}` : block.label;

  return (
    <div>
      <div className={cn(
        'flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5',
        isContainer ? 'bg-muted/10' : '',
        block.hidden ? 'opacity-60 border-dashed' : '',
      )} style={{ marginLeft: `${depth * 16}px` }}>
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-full"
            disabled={forceExpanded}
            onClick={() => onToggleCollapse(block.id)}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        ) : (
          <div className="ml-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{block.label}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{resolveTypeLabel(block.type)}</Badge>
            {hasChildren ? (
              <span className="text-[10px] text-muted-foreground">
                ({countNestedLeafTargets(block)})
              </span>
            ) : null}
          </div>
          {block.description ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{block.description}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Toggle
            variant="outline"
            size="sm"
            pressed={block.publicVisible === true}
            onPressedChange={(pressed) => onToggleVisibility(block.id, 'publicVisible', pressed)}
            className={sharedToggleClassName}
          >
            {block.publicVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            共有
          </Toggle>
          <Toggle
            variant="outline"
            size="sm"
            pressed={block.hidden !== true}
            onPressedChange={(pressed) => onToggleVisibility(block.id, 'hidden', !pressed)}
            className={formToggleClassName}
          >
            {!block.hidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            フォーム
          </Toggle>
        </div>
      </div>

      {hasChildren ? (
        <div className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}>
          <div className="overflow-hidden">
            <div
              className="mt-1 space-y-1 border-l-2 border-border/50"
              style={{ marginLeft: `${depth * 16 + 16}px` }}
            >
              {block.fields.map((child) => (
                <VisibilityTreeNode
                  key={child.id}
                  block={child}
                  depth={depth + 1}
                  parentPath={path}
                  forceExpanded={forceExpanded}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={onToggleCollapse}
                  onToggleVisibility={onToggleVisibility}
                />
              ))}
              {(block.variants ?? []).map((variant) => (
                <VisibilityVariantNode
                  key={variant.id}
                  variantId={variant.id}
                  label={variant.label}
                  depth={depth + 1}
                  parentPath={path}
                  fields={variant.fields}
                  forceExpanded={forceExpanded}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={onToggleCollapse}
                  onToggleVisibility={onToggleVisibility}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VisibilityVariantNode({
  variantId,
  label,
  depth,
  parentPath,
  fields,
  forceExpanded,
  collapsedIds,
  onToggleCollapse,
  onToggleVisibility,
}: {
  variantId: string;
  label: string;
  depth: number;
  parentPath: string;
  fields: SettingSheetBlock[];
  forceExpanded: boolean;
  collapsedIds: Record<string, boolean>;
  onToggleCollapse: (blockId: string) => void;
  onToggleVisibility: (blockId: string, field: 'publicVisible' | 'hidden', nextValue: boolean) => void;
}) {
  const collapsedKey = `variant:${variantId}`;
  const isCollapsed = !forceExpanded && collapsedIds[collapsedKey] === true;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/15 px-3 py-2"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-full"
          disabled={forceExpanded}
          onClick={() => onToggleCollapse(collapsedKey)}
        >
          {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">バリエーション</Badge>
        <span className="min-w-0 text-sm font-medium wrap-break-word">{label}</span>
      </div>

      <div className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-in-out',
        isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
      )}>
        <div className="overflow-hidden">
          <div
            className="mt-1 space-y-1 border-l-2 border-border/50"
            style={{ marginLeft: `${depth * 16 + 16}px` }}
          >
            {fields.map((child) => (
              <VisibilityTreeNode
                key={child.id}
                block={child}
                depth={depth+1}
                parentPath={`${parentPath} / ${label}`}
                forceExpanded={forceExpanded}
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                onToggleVisibility={onToggleVisibility}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}