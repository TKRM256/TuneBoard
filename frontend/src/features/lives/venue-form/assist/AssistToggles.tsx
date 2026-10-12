/** あてふり補助の切り替え（罫線の表示・表の欄に項目を並べる・選択肢の印を置く）。 */
import type { ReactNode } from 'react';
import { Grid3x3, SquareCheck, TableProperties } from 'lucide-react';

import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { AssistTool } from './useVenueAssist';

interface Props {
  lineCount: number;
  showLines: boolean;
  onShowLinesChange: (next: boolean) => void;
  tool: AssistTool;
  onToolChange: (next: AssistTool) => void;
}

export function AssistToggles({ lineCount, showLines, onShowLinesChange, tool, onToolChange }: Props) {
  const noLines = lineCount === 0;
  return (
    <>
      <AssistToggle
        label="罫線を表示"
        tooltip={noLines ? '罫線が見つかりません' : '罫線を表示'}
        pressed={showLines}
        disabled={noLines}
        onPressedChange={onShowLinesChange}
      >
        <Grid3x3 className="size-4" />
      </AssistToggle>
      <AssistToggle
        label="表の欄に項目を並べる"
        tooltip={noLines ? '罫線が見つかりません' : '表の欄に項目を並べる'}
        pressed={tool === 'table'}
        disabled={noLines}
        onPressedChange={(next) => onToolChange(next ? 'table' : 'none')}
      >
        <TableProperties className="size-4" />
      </AssistToggle>
      <AssistToggle
        label="選択肢の印を置く"
        tooltip="選択肢の印を置く"
        pressed={tool === 'marker'}
        disabled={false}
        onPressedChange={(next) => onToolChange(next ? 'marker' : 'none')}
      >
        <SquareCheck className="size-4" />
      </AssistToggle>
    </>
  );
}

interface ToggleProps {
  label: string;
  tooltip: string;
  pressed: boolean;
  disabled: boolean;
  onPressedChange: (next: boolean) => void;
  children: ReactNode;
}

function AssistToggle({ label, tooltip, pressed, disabled, onPressedChange, children }: ToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* 押せないときもツールチップで理由を見せるため span で包む */}
        <span>
          <Toggle size="sm" className="h-7 min-w-7 px-1.5" pressed={pressed} onPressedChange={onPressedChange} disabled={disabled} aria-label={label}>
            {children}
          </Toggle>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
