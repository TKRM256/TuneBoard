/** Header buttons that show/hide the palette / properties / preview panels.
 *  State is owned by the parent so the panels' imperative refs can stay in sync. */
import { PanelLeft, PanelRight, SquareSplitHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type PanelKey = 'palette' | 'properties' | 'preview';

interface Props {
  visible: Record<PanelKey, boolean>;
  onToggle: (key: PanelKey) => void;
}

export function PanelVisibilityToggles({ visible, onToggle }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
        <ToggleButton
          tooltip="部品パレット"
          active={visible.palette}
          onClick={() => onToggle('palette')}
          icon={<PanelLeft className="size-4" />}
        />
        <ToggleButton
          tooltip="プロパティ"
          active={visible.properties}
          onClick={() => onToggle('properties')}
          icon={<PanelRight className="size-4" />}
        />
        <ToggleButton
          tooltip="プレビュー"
          active={visible.preview}
          onClick={() => onToggle('preview')}
          icon={<SquareSplitHorizontal className="size-4" />}
        />
      </div>
    </TooltipProvider>
  );
}

function ToggleButton({ tooltip, active, onClick, icon }: { tooltip: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="icon"
          onClick={onClick}
          className="size-7"
          aria-pressed={active}
          aria-label={tooltip}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}{active ? ' (表示中)' : ' (非表示)'}
      </TooltipContent>
    </Tooltip>
  );
}
