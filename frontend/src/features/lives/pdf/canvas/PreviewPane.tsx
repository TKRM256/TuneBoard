/** Compiled PDF preview pane. Shows an iframe of the most recent compile,
 *  with a "compile now" prompt before the first build. */
import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  previewUrl: string;
  isCompiling: boolean;
  hasCompiledOnce: boolean;
  onCompile: () => void;
}

export function PreviewPane({ previewUrl, isCompiling, hasCompiledOnce, onCompile }: Props) {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex items-center justify-between border-b bg-background/60 px-3 py-2 text-xs">
        <span className="font-medium">プレビュー</span>
        <Button variant="ghost" size="sm" onClick={onCompile} disabled={isCompiling} className="gap-1 text-xs">
          {isCompiling ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          再コンパイル
        </Button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {!hasCompiledOnce && !isCompiling ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
            <p>「コンパイル & プレビュー」ボタンを押すと PDF が生成されます。</p>
            <Button onClick={onCompile} size="sm" className="gap-1">
              <RefreshCw className="size-4" />
              いますぐコンパイル
            </Button>
          </div>
        ) : !previewUrl ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="PDFプレビュー"
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
