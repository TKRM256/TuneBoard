/** 3つの表示先の説明と、列ごとの一括ON/OFF。 */
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { VISIBILITY_SCOPES, type VisibilityScope } from './visibility-scopes';

interface VisibilityScopeLegendProps {
  /** 表示先ごとの「今ONになっている項目数 / 全項目数」 */
  counts: Record<string, number>;
  total: number;
  onBulkChange: (scope: VisibilityScope, visible: boolean) => void;
}

export const VisibilityScopeLegend = ({ counts, total, onBulkChange }: VisibilityScopeLegendProps) => (
  <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-3">
    {VISIBILITY_SCOPES.map((scope) => (
      <div key={scope.key} className="flex flex-col gap-2 rounded-lg border bg-background p-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('size-2.5 shrink-0 rounded-full border', scope.onClassName)} />
            <span className="text-sm font-semibold">{scope.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">{counts[scope.key] ?? 0} / {total}</span>
          </div>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{scope.description}</p>
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onBulkChange(scope, true)}
          >
            <Eye className="size-3.5" />
            全て表示
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onBulkChange(scope, false)}
          >
            <EyeOff className="size-3.5" />
            全て非表示
          </Button>
        </div>
      </div>
    ))}
  </div>
);
