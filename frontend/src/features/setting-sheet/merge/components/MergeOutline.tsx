/** 比較ツリーを元のフォームと同じ並びで描画する */
import type { MergeGroupItemNode, MergeNode } from '../merge-tree';
import type { MergeChoice, MergeSelections } from '../merge-types';
import { MergeFieldRow, MergeSideCell } from './MergeFieldRow';

interface MergeOutlineProps {
  nodes: MergeNode[];
  selections: MergeSelections;
  onSelect: (key: string, choice: MergeChoice) => void;
  depth?: number;
}

export function MergeOutline({ nodes, selections, onSelect, depth = 0 }: MergeOutlineProps) {
  return (
    <div className={depth === 0 ? 'space-y-4' : 'space-y-2'}>
      {nodes.map((node) => {
        if (node.kind === 'field') {
          return (
            <MergeFieldRow
              key={node.key}
              label={node.label}
              row={node.row}
              mine={node.mine}
              theirs={node.theirs}
              choice={selections[node.key]}
              onChange={(choice) => onSelect(node.key, choice)}
            />
          );
        }

        if (node.kind === 'section') {
          return (
            <section key={node.key} className="space-y-2">
              <h3 className="border-b pb-1 text-sm font-semibold">{node.label}</h3>
              <div className="space-y-2 pl-1">
                <MergeOutline nodes={node.children} selections={selections} onSelect={onSelect} depth={depth + 1} />
              </div>
            </section>
          );
        }

        return (
          <section key={node.key} className="space-y-2">
            <h3 className="border-b pb-1 text-sm font-semibold">{node.label}</h3>
            <div className="space-y-2">
              {node.items.map((item) => (
                <GroupItem
                  key={item.key}
                  item={item}
                  selections={selections}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function GroupItem({
  item,
  selections,
  onSelect,
  depth,
}: {
  item: MergeGroupItemNode;
  selections: MergeSelections;
  onSelect: (key: string, choice: MergeChoice) => void;
  depth: number;
}) {
  const choice = selections[item.key];
  const selectedSide = choice?.kind === 'side' ? choice.side : undefined;

  // 項目まるごとの差分（追加・削除・種類違い）。中身には降りず、どちらの状態を取るかだけ選ばせる
  if (item.row) {
    const isConflict = item.row.changedBy === 'both';
    const actionLabel = item.row.kind === 'item-added'
      ? '片方だけに追加された項目です'
      : item.row.kind === 'item-removed'
        ? '片方で削除された項目です'
        : '項目の種類が変わっています';

    return (
      <div
        className={`space-y-2 rounded-lg border-l-4 px-3 py-2.5 ${
          isConflict && !choice ? 'border-l-destructive bg-destructive/5' : 'border-l-primary/40 bg-muted/30'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-sm font-medium">{item.label}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">{actionLabel}</span>
          {isConflict && !choice ? (
            <span className="shrink-0 rounded bg-destructive px-1.5 py-0.5 text-[11px] text-destructive-foreground">
              要選択
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <MergeSideCell
            values={item.row.mine}
            side="mine"
            selected={selectedSide === 'mine'}
            onSelect={() => onSelect(item.key, { kind: 'side', side: 'mine' })}
          />
          <MergeSideCell
            values={item.row.theirs}
            side="theirs"
            selected={selectedSide === 'theirs'}
            onSelect={() => onSelect(item.key, { kind: 'side', side: 'theirs' })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-2">
      <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
        {item.label}
        {item.mineSummary ? <span className="ml-2 text-foreground">{item.mineSummary}</span> : null}
      </p>
      <MergeOutline nodes={item.children} selections={selections} onSelect={onSelect} depth={depth} />
    </div>
  );
}
