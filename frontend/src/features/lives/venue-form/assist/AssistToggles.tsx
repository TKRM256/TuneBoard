/** あてふり補助の切り替え（罫線の表示）。 */
import { Grid3x3 } from 'lucide-react';

import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  lineCount: number;
  showLines: boolean;
  onShowLinesChange: (next: boolean) => void;
}

export function AssistToggles({ lineCount, showLines, onShowLinesChange }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Toggle size="sm" className="h-7 min-w-7 px-1.5" pressed={showLines} onPressedChange={onShowLinesChange} disabled={lineCount === 0} aria-label="罫線を表示">
            <Grid3x3 className="size-4" />
          </Toggle>
        </span>
      </TooltipTrigger>
      <TooltipContent>{lineCount > 0 ? `検出した罫線を表示（${lineCount}本）` : '罫線が見つかりません'}</TooltipContent>
    </Tooltip>
  );
}
