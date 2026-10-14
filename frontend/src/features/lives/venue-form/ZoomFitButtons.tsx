/** 書式エディタの表示合わせ（ページ全体・幅・100%）。 */
import { Maximize, MoveHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  onFitPage: () => void;
  onFitWidth: () => void;
  onReset: () => void;
}

export function ZoomFitButtons({ onFitPage, onFitWidth, onReset }: Props) {
  return (
    <>
      <FitButton tooltip="ページ全体 (Ctrl+0)" onClick={onFitPage}><Maximize className="size-4" /></FitButton>
      <FitButton tooltip="幅に合わせる" onClick={onFitWidth}><MoveHorizontal className="size-4" /></FitButton>
      <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={onReset}>100%</Button>
    </>
  );
}

function FitButton({ tooltip, onClick, children }: { tooltip: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClick}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
