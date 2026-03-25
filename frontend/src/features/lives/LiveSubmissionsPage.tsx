import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import {
  formatLiveDate,
  isSectionBlock,
  isRepeatableGroupBlock,
  resolveRecordLabel,
  type LiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
} from './types/type';

interface ColumnDef {
  id: string;
  label: string;
  path: string[];
  type: SettingSheetBlock['type'];
}

export const LiveSubmissionsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [liveResponse, configResponse, detailsResponse] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
          apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`),
        ]);

        if (!liveResponse || !configResponse) {
          throw new Error('required data missing');
        }

        if (cancelled) {
          return;
        }

        setLive(liveResponse);
        setConfig(configResponse);
        setDetails(detailsResponse ?? []);
      } catch {
        if (!cancelled) {
          toast.error('提出情報の取得に失敗しました', { position: 'top-center' });
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
  }, [liveId]);

  const recordLabel = useMemo(() => resolveRecordLabel(config), [config]);
  const tableColumns = useMemo(() => collectColumns(config), [config]);
  const hasVisibleColumns = tableColumns.length > 0;

  const filteredDetails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return details;
    }
    return details.filter((detail) => {
      return tableColumns.some((column) => {
        const value = extractCellValue(detail.answers, column.path, column.type);
        return value.toLowerCase().includes(query);
      });
    });
  }, [searchQuery, details, tableColumns]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">提出情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const selectedDetail = details.find((d) => d.id === selectedSubmissionId) ?? null;
  const sharedListUrl = `${window.location.origin}/public/lives/${live.publicToken}/submissions/shared`;
  const buildEditFormUrl = (submissionId: string) => `${window.location.origin}/public/lives/${live.publicToken}/submissions/${submissionId}`;

  const copySharedLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedListUrl);
      toast.success('共有リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };

  const copyEditLink = async (submissionId: string) => {
    try {
      await navigator.clipboard.writeText(buildEditFormUrl(submissionId));
      toast.success('編集リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
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
            <BreadcrumbPage>提出確認</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold sm:text-2xl">提出済みSettingSheet</h1>
              <p className="text-sm text-muted-foreground">{live.name} / {formatLiveDate(live.date)} / 全{details.length}件</p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                <ChevronLeft className="size-4" />
                ライブ管理へ戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">提出一覧</CardTitle>
              <p className="text-xs text-muted-foreground">
                {hasVisibleColumns
                  ? '共有ページと同じ公開項目のみ表示。行をクリックすると詳細を確認できます。'
                  : '共有ページで公開する項目を設定すると、その項目だけがここでも一覧表示されます。'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={copySharedLink}>
                <Copy className="size-4" />
                共有一覧リンクをコピー
              </Button>
              <Button asChild size="sm">
                <a href={sharedListUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  共有一覧を開く
                </a>
              </Button>
            </div>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-8" placeholder="公開項目で検索" disabled={!hasVisibleColumns} />
          </div>
        </CardHeader>
        <CardContent>
          {!hasVisibleColumns ? (
            <p className="text-sm text-muted-foreground">共有リンクで公開する項目が設定されていません。管理画面で「共有に表示」をONにした項目だけがここに表示されます。</p>
          ) : filteredDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する提出はありません。</p>
          ) : (
            <div className="rounded-lg border">
              <ScrollArea className="h-[70vh] w-full">
                <Table className="min-w-max">
                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow>
                      {tableColumns.map((column) => (
                        <TableHead key={column.id} className="w-[220px] whitespace-normal bg-background">{column.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetails.map((detail) => (
                      <TableRow
                        key={detail.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedSubmissionId(detail.id); setIsDetailDialogOpen(true); }}
                      >
                        {tableColumns.map((column) => (
                          <TableCell key={`${detail.id}-${column.id}`} className="w-[220px] whitespace-pre-line align-top text-sm">
                            {extractCellValue(detail.answers, column.path, column.type)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[95vw] max-w-3xl overflow-hidden p-0 sm:w-full">
          <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle>提出詳細</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70dvh] px-4 sm:px-6">
            {!selectedDetail ? (
              <p className="py-4 text-sm text-muted-foreground">提出を選択してください。</p>
            ) : (
              <div className="space-y-4 pb-4">
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-3 sm:p-4">
                  <SummaryItem label={recordLabel} value={selectedDetail.recordLabel} />
                  <SummaryItem label="状態" value={<Badge variant="secondary">{selectedDetail.submissionStatus}</Badge>} />
                  <SummaryItem label="提出日時" value={formatSubmittedAt(selectedDetail.submittedAt)} />
                </div>
                <Separator />
                <div className="space-y-3">
                  {config ? renderSubmissionBlocks(config.blocks, selectedDetail.answers, selectedDetail.id) : null}
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="flex-row justify-between gap-2 border-t px-4 py-3 sm:justify-between sm:px-6">
            {selectedDetail ? (
              <Button variant="outline" size="sm" onClick={() => copyEditLink(selectedDetail.id)}>
                <Copy className="size-4" />
                編集リンクをコピー
              </Button>
            ) : <span />}
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      return answer.items.length === 0 ? '未入力' : `${answer.items.length}件`;
    }
    return answer.values.length > 0 ? answer.values.join(' / ') : '未入力';
  }

  const nestedValues = answer.items
    .map((item) => extractCellValue(item.answers, restPath, blockType))
    .filter((value) => value !== '未入力');

  return nestedValues.length === 0 ? '未入力' : nestedValues.join('\n');
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatAnswerValue(values: string[], blockType: SettingSheetBlock['type']) {
  if (values.length === 0) {
    return '未入力';
  }
  if (blockType === 'BOOLEAN') {
    return values[0] === 'true' ? 'はい' : values[0] === 'false' ? 'いいえ' : values.join(' / ');
  }
  return values.join(' / ');
}

function resolveItemTitle(
  block: SettingSheetBlock,
  itemAnswers: SettingSheetSubmissionAnswerResponse[],
  itemIndex: number,
) {
  if (block.titleSourceFieldId) {
    const source = itemAnswers.find((a) => a.fieldId === block.titleSourceFieldId);
    if (source && source.values.length > 0 && source.values[0].trim()) {
      return source.values[0].trim();
    }
  }
  return `${block.entryTitle || block.label} ${itemIndex + 1}`;
}

function renderSubmissionBlocks(
  blocks: SettingSheetBlock[],
  answers: PublicSettingSheetSubmissionDetailResponse['answers'],
  path: string,
) {
  const answerMap = new Map(answers.map((a) => [a.fieldId, a]));

  return blocks.map((block, index) => {
    const key = `${path}-${block.id}-${index}`;
    const answer = answerMap.get(block.id);

    if (isSectionBlock(block.type)) {
      return (
        <Accordion key={key} type="single" collapsible defaultValue={`${key}-open`}>
          <AccordionItem value={`${key}-open`} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="text-left">
                <p className="text-sm font-semibold sm:text-base">{block.label}</p>
                {block.description ? <p className="mt-0.5 text-xs text-muted-foreground">{block.description}</p> : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {block.fields.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">{renderSubmissionBlocks(block.fields, answers, key)}</div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    if (isRepeatableGroupBlock(block.type)) {
      const items = answer?.items ?? [];
      return (
        <div key={key} className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{block.label}</p>
            <Badge variant="outline">{items.length}件</Badge>
          </div>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">未入力</p>
          ) : block.collapsible ? (
            <Accordion type="single" collapsible className="space-y-2">
              {items.map((item, itemIndex) => {
                const itemTitle = resolveItemTitle(block, item.answers, itemIndex);
                return (
                  <AccordionItem key={`${key}-item-${itemIndex}`} value={`${key}-item-${itemIndex}`} className="rounded-lg border">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <span className="text-sm font-medium">{itemTitle}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid gap-3 sm:grid-cols-2">{renderSubmissionBlocks(block.fields, item.answers, `${key}-item-${itemIndex}`)}</div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="space-y-3">
              {items.map((item, itemIndex) => (
                <div key={`${key}-item-${itemIndex}`} className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{resolveItemTitle(block, item.answers, itemIndex)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">{renderSubmissionBlocks(block.fields, item.answers, `${key}-item-${itemIndex}`)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1 rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground">{block.label}</p>
        <p className="whitespace-pre-wrap wrap-break-word text-sm font-medium leading-6">{formatAnswerValue(answer?.values ?? [], block.type)}</p>
      </div>
    );
  });
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
