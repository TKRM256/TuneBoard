/** Top toolbar above the canvas. Provides alignment / distribution actions on
 *  the current selection, plus zoom controls. */
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  selectionCount: number;
  pxPerMm: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
  onLayer: (mode: 'front' | 'back') => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export type AlignMode =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom';

export function AlignmentToolbar({
  selectionCount,
  pxPerMm,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onAlign,
  onDistribute,
  onLayer,
  onDuplicate,
  onDelete,
}: Props) {
  const hasSelection = selectionCount > 0;
  const hasMulti = selectionCount > 1;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-background/95 px-3 py-1.5">
        <Group label="履歴">
          <IconButton tooltip="元に戻す (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton tooltip="やり直し (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
            <Redo2 className="size-4" />
          </IconButton>
        </Group>
        <Divider />
        <Group label="水平">
          <IconButton tooltip="左揃え" disabled={!hasMulti} onClick={() => onAlign('left')}>
            <AlignStartVertical className="size-4" />
          </IconButton>
          <IconButton tooltip="中央揃え (横)" disabled={!hasMulti} onClick={() => onAlign('center-h')}>
            <AlignCenterVertical className="size-4" />
          </IconButton>
          <IconButton tooltip="右揃え" disabled={!hasMulti} onClick={() => onAlign('right')}>
            <AlignEndVertical className="size-4" />
          </IconButton>
        </Group>
        <Divider />
        <Group label="垂直">
          <IconButton tooltip="上揃え" disabled={!hasMulti} onClick={() => onAlign('top')}>
            <AlignStartHorizontal className="size-4" />
          </IconButton>
          <IconButton tooltip="中央揃え (縦)" disabled={!hasMulti} onClick={() => onAlign('center-v')}>
            <AlignCenterHorizontal className="size-4" />
          </IconButton>
          <IconButton tooltip="下揃え" disabled={!hasMulti} onClick={() => onAlign('bottom')}>
            <AlignEndHorizontal className="size-4" />
          </IconButton>
        </Group>
        <Divider />
        <Group label="均等配分">
          <IconButton tooltip="横方向に均等配分" disabled={selectionCount < 3} onClick={() => onDistribute('horizontal')}>
            <AlignHorizontalDistributeCenter className="size-4" />
          </IconButton>
          <IconButton tooltip="縦方向に均等配分" disabled={selectionCount < 3} onClick={() => onDistribute('vertical')}>
            <AlignVerticalDistributeCenter className="size-4" />
          </IconButton>
        </Group>
        <Divider />
        <Group label="重なり">
          <IconButton tooltip="最前面に移動" disabled={!hasSelection} onClick={() => onLayer('front')}>
            <ArrowUpToLine className="size-4" />
          </IconButton>
          <IconButton tooltip="最背面に移動" disabled={!hasSelection} onClick={() => onLayer('back')}>
            <ArrowDownToLine className="size-4" />
          </IconButton>
        </Group>
        <Divider />
        <Group label="操作">
          <IconButton tooltip="複製" disabled={!hasSelection} onClick={onDuplicate}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton tooltip="削除" disabled={!hasSelection} onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        </Group>

        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span>{selectionCount > 0 ? `${selectionCount}件選択中` : '選択なし'}</span>
          <Divider />
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="size-7">
            <ZoomOut className="size-4" />
          </Button>
          <span className="min-w-10 text-center font-mono">{Math.round(pxPerMm * 33.3)}%</span>
          <Button variant="ghost" size="icon" onClick={onZoomIn} className="size-7">
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={label}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

function IconButton({ tooltip, disabled, onClick, children }: { tooltip: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} onClick={onClick} className="size-7">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
