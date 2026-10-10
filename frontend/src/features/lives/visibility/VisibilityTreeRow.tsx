/** 表示設定マトリクスの1行（項目 + 3つの表示先トグル）。 */
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { canContainBlocks, type SettingSheetBlock } from '../types/live-types';
import { VisibilityScopeToggle } from './VisibilityScopeToggle';
import { isVisibleIn, VISIBILITY_SCOPES, type VisibilityScope } from './visibility-scopes';
import { countNestedLeafBlocks, resolveTypeLabel } from './visibility-tree';

interface CommonProps {
  parentPath: string;
  /** 検索中は階層が飛ぶので、親のパスを添えて位置が分かるようにする */
  showPath: boolean;
  forceExpanded: boolean;
  collapsedIds: Record<string, boolean>;
  onToggleCollapse: (key: string) => void;
  onChangeVisibility: (blockId: string, scope: VisibilityScope, visible: boolean) => void;
}

interface VisibilityTreeRowProps extends CommonProps {
  block: SettingSheetBlock;
}

export const VisibilityTreeRow = ({
  block,
  parentPath,
  showPath,
  forceExpanded,
  collapsedIds,
  onToggleCollapse,
  onChangeVisibility,
}: VisibilityTreeRowProps) => {
  const isContainer = canContainBlocks(block.type);
  const hasChildren = block.fields.length > 0 || (block.variants ?? []).some((variant) => variant.fields.length > 0);
  const isCollapsed = !forceExpanded && collapsedIds[block.id] === true;
  const path = parentPath ? `${parentPath} / ${block.label}` : block.label;

  return (
    <div>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-xl border px-2.5 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-3',
          isContainer ? 'border-border bg-muted/40' : 'bg-background',
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 rounded-full"
              disabled={forceExpanded}
              aria-label={isCollapsed ? `${block.label}を開く` : `${block.label}を閉じる`}
              onClick={() => onToggleCollapse(block.id)}
            >
              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          ) : (
            <span className="mt-2.5 ml-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
          )}

          <div className="min-w-0 flex-1 py-0.5">
            {showPath && parentPath ? (
              <p className="truncate text-[10px] leading-tight text-muted-foreground">{parentPath}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('wrap-break-word text-sm', isContainer ? 'font-semibold' : 'font-medium')}>
                {block.label}
              </span>
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{resolveTypeLabel(block.type)}</Badge>
              {hasChildren ? (
                <span className="text-[10px] text-muted-foreground">{countNestedLeafBlocks(block)}項目</span>
              ) : null}
            </div>
            {block.description ? (
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{block.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {VISIBILITY_SCOPES.map((scope) => (
            <VisibilityScopeToggle
              key={scope.key}
              scope={scope}
              label={block.label}
              visible={isVisibleIn(block, scope)}
              onChange={(visible) => onChangeVisibility(block.id, scope, visible)}
            />
          ))}
        </div>
      </div>

      {hasChildren ? (
        <ChildBranch collapsed={isCollapsed}>
          {block.fields.map((child) => (
            <VisibilityTreeRow
              key={child.id}
              block={child}
              parentPath={path}
              showPath={showPath}
              forceExpanded={forceExpanded}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onChangeVisibility={onChangeVisibility}
            />
          ))}
          {(block.variants ?? []).map((variant) => (
            <VisibilityVariantRow
              key={variant.id}
              variantId={variant.id}
              label={variant.label}
              fields={variant.fields}
              parentPath={path}
              showPath={showPath}
              forceExpanded={forceExpanded}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onChangeVisibility={onChangeVisibility}
            />
          ))}
        </ChildBranch>
      ) : null}
    </div>
  );
};

interface VisibilityVariantRowProps extends CommonProps {
  variantId: string;
  label: string;
  fields: SettingSheetBlock[];
}

const VisibilityVariantRow = ({
  variantId,
  label,
  fields,
  parentPath,
  showPath,
  forceExpanded,
  collapsedIds,
  onToggleCollapse,
  onChangeVisibility,
}: VisibilityVariantRowProps) => {
  const collapsedKey = `variant:${variantId}`;
  const isCollapsed = !forceExpanded && collapsedIds[collapsedKey] === true;

  return (
    <div>
      <div className="flex items-center gap-1.5 rounded-lg border border-dashed bg-muted/20 px-2.5 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-full"
          disabled={forceExpanded}
          aria-label={isCollapsed ? `${label}を開く` : `${label}を閉じる`}
          onClick={() => onToggleCollapse(collapsedKey)}
        >
          {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">バリエーション</Badge>
        <span className="min-w-0 wrap-break-word text-sm font-medium">{label}</span>
      </div>

      <ChildBranch collapsed={isCollapsed}>
        {fields.map((child) => (
          <VisibilityTreeRow
            key={child.id}
            block={child}
            parentPath={`${parentPath} / ${label}`}
            showPath={showPath}
            forceExpanded={forceExpanded}
            collapsedIds={collapsedIds}
            onToggleCollapse={onToggleCollapse}
            onChangeVisibility={onChangeVisibility}
          />
        ))}
      </ChildBranch>
    </div>
  );
};

/**
 * 折りたたみアニメーション付きの子ブロック領域。
 * 階層のインデントはこの入れ子だけで作るので、行そのものは余白を持たない。
 */
const ChildBranch = ({ collapsed, children }: { collapsed: boolean; children: ReactNode }) => (
  <div className={cn('grid transition-[grid-template-rows] duration-200 ease-in-out', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
    <div className="overflow-hidden">
      <div className="mt-1 ml-2 space-y-1 border-l-2 border-border/60 pl-1.5 sm:ml-4 sm:pl-2.5">
        {children}
      </div>
    </div>
  </div>
);
