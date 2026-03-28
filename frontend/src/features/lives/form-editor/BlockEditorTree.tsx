import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { BlockSettingsPanel } from './BlockSettingsPanel';
import { getSiblingCount, summarizeBlock } from './utils';
import {
  isRepeatableGroupBlock,
  SETTING_SHEET_BLOCK_OPTIONS,
  type SettingSheetBlock,
  type SettingSheetOptionSource,
} from '../types/type';
import { AddBlockMenu } from './AddBlockMenu';

interface BlockEditorTreeProps {
  blocks: SettingSheetBlock[];
  rootBlocks: SettingSheetBlock[];
  optionSourceCandidates: Array<{ value: string; label: string }>;
  onMove: (parentId: string | null, blockIndex: number, direction: 'up' | 'down') => void;
  onRemove: (blockId: string) => void;
  onInsert: (parentId: string | null, insertIndex: number, type: SettingSheetBlock['type']) => void;
  onUpdateBlock: (blockId: string, patch: Partial<SettingSheetBlock>) => void;
  onChangeType: (blockId: string, nextType: SettingSheetBlock['type']) => void;
  onApplyGroupAppearance: (blockId: string, appearance: SettingSheetBlock['appearance']) => void;
  onUpdateOptionSource: (blockId: string, source: SettingSheetOptionSource | null) => void;
}

export const BlockEditorTree = ({
  blocks,
  rootBlocks,
  optionSourceCandidates,
  onMove,
  onRemove,
  onInsert,
  onUpdateBlock,
  onChangeType,
  onApplyGroupAppearance,
  onUpdateOptionSource,
}: BlockEditorTreeProps) => {
  const renderBlockEditor = (block: SettingSheetBlock, index: number, parentId: string | null, depth = 0) => {
    const blockTypeLabel = SETTING_SHEET_BLOCK_OPTIONS.find((option) => option.value === block.type)?.label;
    const siblingCount = getSiblingCount(rootBlocks, parentId);

    return (
      <Accordion key={block.id} type="single" collapsible className="w-full" defaultValue={depth === 0 && index === 0 ? 'details' : undefined}>
        <div className="rounded-2xl border bg-background p-3 shadow-sm sm:p-4" style={{ marginLeft: depth * 12 }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{blockTypeLabel}</Badge>
                {isRepeatableGroupBlock(block.type) && block.titleSourceFieldId ? <Badge variant="outline">タイトル連動</Badge> : null}
                {block.hidden ? <Badge variant="outline">非表示</Badge> : null}
              </div>
              <div>
                <p className="text-sm font-medium">{index + 1}. {block.label || '無題のブロック'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{summarizeBlock(block)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              <Button type="button" variant="outline" size="sm" onClick={() => onMove(parentId, index, 'up')} disabled={index === 0}>
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onMove(parentId, index, 'down')} disabled={index >= siblingCount - 1}>
                <ArrowDown className="size-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onRemove(block.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <AccordionItem value="details" className="mt-3 border-none">
            <AccordionTrigger className="rounded-xl border px-3 py-2 text-sm hover:bg-muted/40 hover:no-underline">
              設定を開く
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <BlockSettingsPanel
                block={block}
                index={index}
                parentId={parentId}
                depth={depth}
                optionSourceCandidates={optionSourceCandidates}
                onInsert={onInsert}
                onUpdateBlock={onUpdateBlock}
                onChangeType={onChangeType}
                onApplyGroupAppearance={onApplyGroupAppearance}
                onUpdateOptionSource={onUpdateOptionSource}
                renderNestedBlock={(child, childIndex, nestedParentId, nestedDepth) => renderBlockEditor(child, childIndex, nestedParentId, nestedDepth)}
              />              
            </AccordionContent>
          </AccordionItem>
        </div>
      </Accordion>
    );
  };

  return (
    <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={block.id}>
            {renderBlockEditor(block, index, null)}
            <div className="mt-2 flex justify-end">
                <AddBlockMenu
                    options={SETTING_SHEET_BLOCK_OPTIONS}
                    onSelect={(type) => onInsert(null, index + 1, type)}
                    buttonLabel="追加"
                />
              </div>
          </div>
        ))}
      </div>
  );
};
