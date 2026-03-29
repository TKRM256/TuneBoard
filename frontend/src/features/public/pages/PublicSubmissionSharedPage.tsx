import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';
import {
  isSectionBlock,
  isRepeatableGroupBlock,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetSubmissionAnswerResponse,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

interface ColumnDef {
  id: string;
  label: string;
  path: string[];
  type: SettingSheetBlock['type'];
}

export const PublicSubmissionSharedPage = () => {
  const { publicToken, submissionId } = useParams<{ publicToken: string; submissionId?: string }>();
  const [live, setLive] = useState<PublicLiveResponse | null>(null);
  const [submissions, setSubmissions] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!publicToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const liveResponse = await apiClient.get<PublicLiveResponse>(`/public/lives/${publicToken}`);
        const submissionResponse = submissionId
          ? await apiClient.get<PublicSettingSheetSubmissionDetailResponse>(`/public/lives/${publicToken}/setting-sheet/submissions/${submissionId}/shared`).then((r) => r ? [r] : [])
          : await apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/public/lives/${publicToken}/setting-sheet/submissions/shared`).then((r) => r ?? []);

        if (!cancelled) {
          setLive(liveResponse ?? null);
          setSubmissions(submissionResponse);
          setErrorMessage('');
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message = error instanceof ApiClientError
            ? (error.apiError?.message ?? '共有提出データの取得に失敗しました')
            : '共有提出データの取得に失敗しました';
          setErrorMessage(message);
          toast.error(message, { position: 'top-center' });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [publicToken, submissionId]);

  const config = live?.settingSheetConfig ?? null;
  const columns = useMemo(() => collectColumns(config), [config]);
  const hasVisibleColumns = columns.length > 0;

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return submissions;
    }
    return submissions.filter((submission) => {
      return columns.some((column) => {
        const value = extractCellValue(submission.answers, column.path, column.type);
        return value.toLowerCase().includes(query);
      });
    });
  }, [submissions, searchQuery, columns]);

  if (!publicToken) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">共有データを読み込み中です...</div>;
  }

  if (!live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <h1 className="text-xl font-semibold">TuneBoard</h1>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage || '共有データが見つかりませんでした。'}</p>
            <Link to={`/public/lives/${publicToken}`} className="mt-3 inline-block text-sm text-primary underline underline-offset-4">公開フォームに戻る</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold">{live.name} - 提出共有一覧</h1>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                  placeholder="公開項目で検索"
                  disabled={!hasVisibleColumns}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>件数: {filteredSubmissions.length}件</span>
              <span>公開項目: {columns.length}件</span>
              <Link to={`/public/lives/${publicToken}`} className="underline underline-offset-4">公開フォームに戻る</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">公開項目</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissionId && submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">指定された提出データは公開されていないか、見つかりませんでした。</p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">公開可能な提出データがありません。</p>
            ) : !hasVisibleColumns ? (
              <p className="text-sm text-muted-foreground">共有リンクで公開する項目が設定されていません。管理画面で「共有に表示」をONにした項目だけがここに表示されます。</p>
            ) : filteredSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">検索条件に一致する提出がありません。</p>
            ) : (
              <div className="rounded-lg border">
                <ScrollArea className="h-[70vh] w-full">
                  <Table className="min-w-max">
                    <TableHeader className="sticky top-0 z-20 bg-background">
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={column.id} className="w-[220px] whitespace-normal bg-background">{column.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          {columns.map((column) => (
                            <TableCell key={`${submission.id}-${column.id}`} className="w-[220px] whitespace-pre-line align-top text-sm">
                              {extractCellValue(submission.answers, column.path, column.type)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
            <p className="text-xs text-muted-foreground">このページには管理者が公開設定した項目のみ表示されます。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function collectColumns(config: SettingSheetConfigResponse | null): ColumnDef[] {
  if (!config) {
    return [];
  }
  const columns: ColumnDef[] = [];

  const visit = (blocks: SettingSheetConfigResponse['blocks'], labelTrail: string[], answerPath: string[]) => {
    for (const block of blocks) {
      const nextLabelTrail = isSectionBlock(block.type) ? [...labelTrail, block.label] : labelTrail;
      const nextAnswerPath = isSectionBlock(block.type) ? answerPath : [...answerPath, block.id];

      if (block.publicVisible && !isSectionBlock(block.type)) {
        columns.push({
          id: block.id,
          label: [...labelTrail, block.label].join(' / '),
          path: [...answerPath, block.id],
          type: block.type,
        });
      }

      if (block.fields.length > 0) {
        visit(block.fields, nextLabelTrail, nextAnswerPath);
      }
    }
  };

  visit(config.blocks, [], []);
  return columns;
}

function extractCellValue(
  answers: SettingSheetSubmissionAnswerResponse[],
  path: string[],
  blockType: SettingSheetBlock['type'],
): string {
  if (path.length === 0) {
    return '未入力';
  }

  const [currentId, ...restPath] = path;
  const answer = answers.find((entry) => entry.fieldId === currentId);
  if (!answer) {
    return '未入力';
  }

  if (restPath.length === 0) {
    if (blockType === 'REPEATABLE_GROUP') {
      if (answer.items.length === 0) {
        return '未入力';
      }
      return `${answer.items.length}件`;
    }

    return answer.values.length > 0 ? answer.values.join(' / ') : '未入力';
  }

  const nestedValues = answer.items
    .map((item) => extractCellValue(item.answers, restPath, blockType))
    .filter((value) => value !== '未入力');

  if (nestedValues.length === 0) {
    if (isRepeatableGroupBlock(blockType)) {
      return '未入力';
    }

    return '未入力';
  }

  return nestedValues.join('\n');
}
