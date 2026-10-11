/** あてふり補助の切り替え（罫線の表示・罫線への吸着・範囲から表を作る）。 */
import type { ReactNode } from 'react';
import { Grid3x3, Magnet, TableProperties } from 'lucide-react';

import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { AssistTool } from './useVenueAssist';

interface Props {
  lineCount: number;
  showLines: boolean;
  onShowLinesChange: (next: boolean) => void;
  snap: boolean;
  onSnapChange: (next: boolean) => void;
  tool: AssistTool;
  onToolChange: (next: AssistTool) => void;
}

export function AssistToggles({ lineCount, showLines, onShowLinesChange, snap, onSnapChange, tool, onToolChange }: Props) {
  const noLines = lineCount === 0;
  return (
    <>
      <AssistToggle
        label="罫線を表示"
        tooltip={noLines ? '罫線が見つかりません' : `検出した罫線を表示（${lineCount}本）`}
        pressed={showLines}
        disabled={noLines}
        onPressedChange={onShowLinesChange}
      >
        <Grid3x3 className="size-4" />
      </AssistToggle>
      <AssistToggle
        label="罫線に吸着"
        tooltip={noLines ? '罫線が見つかりません' : '罫線に吸着（Alt を押している間は吸着しない）'}
        pressed={snap && !noLines}
        disabled={noLines}
        onPressedChange={onSnapChange}
      >
        <Magnet className="size-4" />
      </AssistToggle>
      <AssistToggle
        label="範囲から表を作る"
        tooltip={noLines ? '罫線が見つかりません' : '範囲から表を作る（書式の表をドラッグで囲む。Esc でやめる）'}
        pressed={tool === 'table'}
        disabled={noLines}
        onPressedChange={(next) => onToolChange(next ? 'table' : 'none')}
      >
        <TableProperties className="size-4" />
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
