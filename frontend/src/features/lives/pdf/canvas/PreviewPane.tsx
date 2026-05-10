/** Compiled PDF preview pane. Shows an iframe of the most recent compile,
 *  with a "compile now" prompt before the first build. */
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  previewUrl: string;
  isCompiling: boolean;
  hasCompiledOnce: boolean;
  totalCount?: number;
  currentIndex?: number;
  onChangeIndex?: (index: number) => void;
}

export function PreviewPane({ previewUrl, isCompiling, hasCompiledOnce, totalCount = 1, currentIndex = 0, onChangeIndex }: Props) {
  const showNav = totalCount > 1 && onChangeIndex;

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {showNav && (
        <div className="flex items-center justify-center gap-2 border-b bg-background px-3 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={currentIndex === 0}
            onClick={() => onChangeIndex(currentIndex - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {totalCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={currentIndex === totalCount - 1}
            onClick={() => onChangeIndex(currentIndex + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
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
