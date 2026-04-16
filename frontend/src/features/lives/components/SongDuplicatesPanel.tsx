import { AlertTriangle, Loader2, MoreHorizontal, Music, RefreshCw, ShieldCheck, ShieldQuestion, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SongDuplicateGroup, SongDuplicateResponse } from '../types/live-types';

interface SongDuplicatesPanelProps {
  data: SongDuplicateResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  onDismiss?: (normalizedTitle: string) => void;
  isAdmin?: boolean;
}

export const SongDuplicatesPanel = ({ data, isLoading, onRefresh, onDismiss, isAdmin = true }: SongDuplicatesPanelProps) => {

  const menuButton = isAdmin ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={isLoading}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className="size-4" />
          再取得
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (data == null) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Music className="size-5 text-muted-foreground" />
              )}
              <CardTitle className="text-base sm:text-lg">曲かぶり検出</CardTitle>
            </div>
            {menuButton}
          </div>
          <p className="text-xs text-muted-foreground">
            提出があるたびに自動で曲の重複を検出します。
          </p>
        </CardHeader>
      </Card>
    );
  }

  const hasDuplicates = data.totalDuplicateGroups > 0;
  const activeGroups = data.groups.filter((g) => !g.dismissed);
  const dismissedGroups = data.groups.filter((g) => g.dismissed);

  return (
    <Card className={hasDuplicates ? 'border-amber-300 dark:border-amber-700' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {hasDuplicates ? (
              <AlertTriangle className="size-5 text-amber-500" />
            ) : (
              <Music className="size-5 text-green-500" />
            )}
            <CardTitle className="text-base sm:text-lg">曲かぶり検出</CardTitle>
            {hasDuplicates ? (
              <Badge variant="destructive">{data.totalDuplicateGroups}件の重複</Badge>
            ) : (
              <Badge variant="secondary">重複なし</Badge>
            )}
          </div>
          {menuButton}
        </div>
      </CardHeader>
      {data.groups.length > 0 && (
        <CardContent className="space-y-4">
          {activeGroups.map((group, groupIndex) => (
            <DuplicateGroupCard
              key={groupIndex}
              group={group}
              index={groupIndex}
              onDismiss={onDismiss}
            />
          ))}
          {dismissedGroups.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">除外済み ({dismissedGroups.length}件)</p>
              {dismissedGroups.map((group, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 opacity-60">
                  <span className="text-sm">{group.normalizedTitle}</span>
                  {group.normalizedArtist && (
                    <span className="text-xs text-muted-foreground">— {group.normalizedArtist}</span>
                  )}
                  <ConfidenceBadge confidence={group.confidence} />
                  {onDismiss && (
                    <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => onDismiss(group.normalizedTitle)}>
                      除外解除
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

function ConfidenceBadge({ confidence }: { confidence: SongDuplicateGroup['confidence'] }) {
  switch (confidence) {
    case 'HIGH':
      return (
        <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400">
          <ShieldCheck className="size-3" />
          高確信
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge variant="outline" className="gap-1 border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          <ShieldQuestion className="size-3" />
          中確信
        </Badge>
      );
    case 'LOW':
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          低確信
        </Badge>
      );
  }
}

function DuplicateGroupCard({
  group,
  index,
  onDismiss,
}: {
  group: SongDuplicateGroup;
  index: number;
  onDismiss?: (normalizedTitle: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          重複 {index + 1}
        </Badge>
        <span className="text-sm font-semibold">{group.normalizedTitle}</span>
        {group.normalizedArtist && (
          <>
            <span className="text-xs text-muted-foreground">—</span>
            <span className="text-sm text-muted-foreground">{group.normalizedArtist}</span>
          </>
        )}
        <ConfidenceBadge confidence={group.confidence} />
        {group.itunesTrackId && (
          <Badge variant="outline" className="text-[10px]">iTunes照合済み</Badge>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDismiss(group.normalizedTitle)}
          >
            <X className="size-3" />
            被りじゃない
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">提出者</TableHead>
              <TableHead className="min-w-[120px]">曲名</TableHead>
              <TableHead className="min-w-[100px]">アーティスト</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.entries.map((entry, entryIndex) => (
              <TableRow key={entryIndex} className="bg-amber-50/30 dark:bg-amber-950/10">
                <TableCell>
                  <Badge variant="secondary" className="font-normal">{entry.recordLabel}</Badge>
                </TableCell>
                <TableCell className="text-sm">{entry.originalTitle}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{entry.originalArtist || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
