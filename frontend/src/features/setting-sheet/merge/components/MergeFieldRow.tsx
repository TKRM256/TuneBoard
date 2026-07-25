/** フォーム 1 項目分を、自分／相手の 2 列で並べて選ばせる */
import { Check } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { formatValues } from '../merge-format';
import type { MergeChoice, MergeRow, MergeSide } from '../merge-types';

interface MergeFieldRowProps {
  label: string;
  row: MergeRow | null;
  mine: string[];
  theirs: string[];
  choice: MergeChoice | undefined;
  onChange: (choice: MergeChoice) => void;
}

export function MergeSideCell({
  values,
  side,
  selected,
  onSelect,
}: {
  values: string[] | null;
  side: MergeSide;
  selected: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {selected ? <Check className="size-3 text-primary" /> : null}
        {side === 'mine' ? '自分' : '相手'}
      </span>
      <span className="mt-1 block whitespace-pre-wrap wrap-break-word">{formatValues(values)}</span>
    </>
  );

  if (!onSelect) {
    return <div className="min-w-0 flex-1 rounded-md border border-dashed p-2 text-sm text-muted-foreground">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-0 flex-1 rounded-md border p-2 text-left text-sm transition-colors ${
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-foreground/30 hover:bg-muted/50'
      }`}
    >
      {content}
    </button>
  );
}

export function MergeFieldRow({ label, row, mine, theirs, choice, onChange }: MergeFieldRowProps) {
  // 差分の無い項目はフォームの文脈として 1 列で静かに見せる
  if (!row) {
    return (
      <div className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-baseline">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">{formatValues(mine)}</p>
      </div>
    );
  }

  const selectedSide = choice?.kind === 'side' ? choice.side : undefined;
  const isConflict = row.changedBy === 'both';
  const inputValue = choice?.kind === 'text'
    ? choice.value
    : (selectedSide === 'theirs' ? theirs[0] : mine[0]) ?? '';

  return (
    <div
      className={`space-y-2 rounded-lg border-l-4 px-3 py-2.5 ${
        isConflict && !choice ? 'border-l-destructive bg-destructive/5' : 'border-l-primary/40 bg-muted/30'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 wrap-break-word text-sm font-medium">{label}</p>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${
          isConflict
            ? (choice ? 'bg-secondary text-secondary-foreground' : 'bg-destructive text-destructive-foreground')
            : 'bg-secondary text-secondary-foreground'
        }`}
        >
          {isConflict ? (choice ? '選択済み' : '要選択') : row.changedBy === 'theirs' ? '相手が変更' : '自分が変更'}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <MergeSideCell
          values={row.mine}
          side="mine"
          selected={selectedSide === 'mine'}
          onSelect={() => onChange({ kind: 'side', side: 'mine' })}
        />
        <MergeSideCell
          values={row.theirs}
          side="theirs"
          selected={selectedSide === 'theirs'}
          onSelect={() => onChange({ kind: 'side', side: 'theirs' })}
        />
      </div>

      {row.editable ? (
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            直接入力（どちらでもない内容にしたいとき）
          </span>
          {row.multiline ? (
            <Textarea
              rows={3}
              value={inputValue}
              onChange={(event) => onChange({ kind: 'text', value: event.target.value })}
              className={choice?.kind === 'text' ? 'border-primary ring-1 ring-primary' : undefined}
            />
          ) : (
            <Input
              value={inputValue}
              onChange={(event) => onChange({ kind: 'text', value: event.target.value })}
              className={choice?.kind === 'text' ? 'border-primary ring-1 ring-primary' : undefined}
            />
          )}
        </label>
      ) : null}
    </div>
  );
}
