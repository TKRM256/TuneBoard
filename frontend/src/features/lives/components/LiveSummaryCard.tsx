/** ライブ管理ページのサマリカード。件数タイルと最近のアクティビティをまとめて出す。 */
import { Link } from 'react-router-dom';
import { AlertTriangle, FileCheck2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PublicSettingSheetSubmissionDetailResponse, SongDuplicateResponse } from '../types/live-types';
import { collectRecentActivities, formatActivityTime } from '../helpers/live-activity-helpers';

interface LiveSummaryCardProps {
  details: PublicSettingSheetSubmissionDetailResponse[];
  duplicates: SongDuplicateResponse | null;
  submissionsPath: string;
  onSelectSubmission: (submissionId: string) => void;
}

export function LiveSummaryCard({ details, duplicates, submissionsPath, onSelectSubmission }: LiveSummaryCardProps) {
  const duplicateCount = duplicates?.totalDuplicateGroups ?? 0;
  const activities = collectRecentActivities(details);
  const hasMore = details.length > activities.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h2 className="text-base font-semibold">サマリ</h2>
          <Button asChild variant="outline" size="sm">
            <Link to={submissionsPath}>
              <FileCheck2 className="size-4" />
              提出確認へ
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="提出" value={details.length} unit="件" />
          <StatTile
            label="曲かぶり"
            value={duplicateCount}
            unit="件"
            alert={duplicateCount > 0}
            note={duplicateCount === 0 ? '重複はありません' : undefined}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">最近のアクティビティ</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ提出はありません。</p>
          ) : (
            <ul className="space-y-1">
              {activities.map((activity) => (
                <li key={activity.submissionId}>
                  <button
                    type="button"
                    onClick={() => onSelectSubmission(activity.submissionId)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <Badge variant={activity.kind === 'created' ? 'default' : 'secondary'} className="shrink-0">
                      {activity.kind === 'created' ? '新規' : '更新'}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{activity.recordLabel}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatActivityTime(activity.occurredAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to={submissionsPath}>すべて見る（{details.length}件） →</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  unit,
  alert = false,
  note,
}: {
  label: string;
  value: number;
  unit: string;
  alert?: boolean;
  note?: string;
}) {
  return (
    <div className={cn('rounded-lg border p-3', alert && 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20')}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {alert && <AlertTriangle className="size-3.5 text-amber-500" />}
        {label}
      </div>
      <p className="mt-1">
        <span className={cn('text-2xl font-semibold tabular-nums', alert && 'text-amber-600 dark:text-amber-400')}>{value}</span>
        <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
      </p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
