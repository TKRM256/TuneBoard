import { type ReactNode } from 'react';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import { AddBlockMenu } from './AddBlockMenu';
import { isSectionBlock, SETTING_SHEET_BLOCK_OPTIONS, type SettingSheetBlock } from '../types/live-types';

interface BlockChildrenEditorProps {
  block: SettingSheetBlock;
  depth: number;
  onInsert: (parentId: string | null, insertIndex: number, type: SettingSheetBlock['type']) => void;
  renderNestedBlock: (child: SettingSheetBlock, childIndex: number, nestedParentId: string | null, nestedDepth: number) => ReactNode;
}

export const BlockChildrenEditor = ({ block, depth, onInsert, renderNestedBlock }: BlockChildrenEditorProps) => {
  return (
      <AccordionItem value="fields" className="rounded-xl px-3 border">
        <AccordionTrigger className="py-2 text-sm hover:no-underline">
          {isSectionBlock(block.type) ? 'セクション内ブロック' : 'グループ内フィールド'}
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-3">
          <p className="text-xs text-muted-foreground">
            {isSectionBlock(block.type)
              ? 'このセクションの中に表示するブロックを定義します。'
              : 'このグループの中で繰り返し入力される項目を定義します。'}
          </p>
          <div className="space-y-3">
              {block.fields.map((child, childIndex) => (
                <div key={child.id}>
                  {renderNestedBlock(child, childIndex, block.id, depth + 1)}
                  <div className="mt-2 flex justify-end">
                    <AddBlockMenu
                      options={SETTING_SHEET_BLOCK_OPTIONS}
                      onSelect={(type) => onInsert(block.id, childIndex + 1, type)}
                      buttonLabel="追加"
                    />
                  </div>
                </div>
              ))}
            </div>
          {block.fields.length === 0 ? (
            <div className="mt-2 flex justify-end">
              <AddBlockMenu
                options={SETTING_SHEET_BLOCK_OPTIONS}
                onSelect={(type) => onInsert(block.id, block.fields.length, type)}
                buttonLabel="追加"
              />
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>
  );
};
