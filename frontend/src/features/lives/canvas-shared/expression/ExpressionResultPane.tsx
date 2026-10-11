/** 拡大編集モーダルの結果ペイン。
 *  「いま選んでいる提出だけの結果」と「全提出に対して評価した結果」を切り替えられる。
 *  後者は、一部の提出でだけ空になる・壊れる式に気づくためのもの。 */
import { useState } from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useExpressionPreview, type ExpressionPreviewRow, type ExpressionRowScope } from './ExpressionPreviewContext';
import { ExpressionPreviewLine } from './ExpressionPreviewLine';

interface Props {
  draft: string;
  scope?: ExpressionRowScope;
}

export function ExpressionResultPane({ draft, scope }: Props) {
  const { previewExpressionForAll } = useExpressionPreview();
  const [rows, setRows] = useState<ExpressionPreviewRow[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  const runAll = async () => {
    if (!previewExpressionForAll) {
      return;
    }
    setIsRunning(true);
    setFailed(false);
    try {
      setRows(await previewExpressionForAll(draft, scope));
    } catch {
      setFailed(true);
    } finally {
      setIsRunning(false);
    }
  };

  const errorCount = rows?.filter((row) => row.error).length ?? 0;
  const emptyCount = rows?.filter((row) => !row.error && !row.result.trim()).length ?? 0;

  return (
    <Tabs defaultValue="current" className="flex min-h-0 flex-1 flex-col gap-2">
      <TabsList className="w-full">
        <TabsTrigger value="current" className="flex-1 text-xs">この提出</TabsTrigger>
        <TabsTrigger value="all" className="flex-1 text-xs">全提出でまとめて確認</TabsTrigger>
      </TabsList>

      <TabsContent
        value="current"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border bg-background p-2"
      >
        <ExpressionPreviewLine expression={draft} scope={scope} expanded />
      </TabsContent>

      <TabsContent value="all" className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => void runAll()}
            disabled={!previewExpressionForAll || isRunning}
          >
            {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            全提出で評価
          </Button>
          {rows ? (
            <span className="text-[10px] text-muted-foreground">
              {rows.length}件
              {errorCount > 0 ? ` / エラー ${errorCount}件` : ''}
              {emptyCount > 0 ? ` / 空 ${emptyCount}件` : ''}
            </span>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border bg-background">
          {failed ? (
            <p className="p-3 text-[11px] text-destructive">評価に失敗しました。時間をおいて試してください。</p>
          ) : !rows ? (
            <p className="p-3 text-[11px] text-muted-foreground">
              「全提出で評価」を押すと、この式をすべての提出に当てはめた結果を一覧で確認できます。
            </p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-[11px] text-muted-foreground">提出がまだありません。</p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.submissionId} className="px-2 py-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {row.error ? <AlertTriangle className="size-3 shrink-0 text-destructive" /> : null}
                    <span className="truncate">{row.recordLabel || '(名称なし)'}</span>
                  </div>
                  <p
                    className={`whitespace-pre-wrap wrap-break-word font-mono text-[11px] ${
                      row.error ? 'text-destructive' : row.result.trim() ? '' : 'text-muted-foreground/70'
                    }`}
                  >
                    {row.result.trim() ? row.result : '(空)'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
