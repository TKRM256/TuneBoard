import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';
import {
  isSectionBlock,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import { extractCellValue } from '../../lives/helpers/submission-table-helpers';


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
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <h1 className="text-xl font-semibold">TuneBoard</h1>
            <ThemeToggle className="shrink-0" />
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">{live.name} - 提出共有一覧</h1>
              </div>
              <ThemeToggle className="w-full sm:w-auto" />
            </div>
            <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                  disabled={!hasVisibleColumns}
                />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span>提出: {filteredSubmissions.length}件</span>
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
                  <Table>
                    <TableHeader className="sticky top-0 z-20 bg-background">
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={column.id} className="min-w-[150px] whitespace-normal bg-background">{column.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          {columns.map((column) => (
                            <TableCell key={`${submission.id}-${column.id}`} className="min-w-[150px] whitespace-pre-line align-top text-sm">
                              {extractCellValue(submission.answers, column.path, column.type)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </div>
            )}
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

      if (block.variants && block.variants.length > 0) {
        const baseVariantLabelTrail = isSectionBlock(block.type) ? nextLabelTrail : [...labelTrail, block.label];
        for (const variant of block.variants) {
          const variantLabelTrail = [...baseVariantLabelTrail, variant.label];
          visit(variant.fields, variantLabelTrail, nextAnswerPath);
        }
      }
    }
  };

  visit(config.blocks, [], []);
  return columns;
}