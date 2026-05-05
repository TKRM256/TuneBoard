/** Compiled PDF preview pane. Shows an iframe of the most recent compile,
 *  with a "compile now" prompt before the first build. */
import { Loader2 } from 'lucide-react';

interface Props {
  previewUrl: string;
  isCompiling: boolean;
  hasCompiledOnce: boolean;
}

export function PreviewPane({ previewUrl, isCompiling, hasCompiledOnce }: Props) {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="relative flex-1 overflow-hidden">
        {!hasCompiledOnce && !isCompiling ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
            <p>「コンパイル」を押すと PDF が生成されます。</p>
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
