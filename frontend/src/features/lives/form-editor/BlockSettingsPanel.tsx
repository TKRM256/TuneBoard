import { type ReactNode } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { BlockChildrenEditor } from './BlockChildrenEditor';
import { BlockOptionEditor } from './BlockOptionEditor';
import {
  collectTitleSourceCandidates,
  optionColumnOptions,
  resolveSharedChildAppearance,
  widthOptions,
} from './utils';
import {
  canContainBlocks,
  DUPLICATE_DETECTION_ROLE_OPTIONS,
  type DuplicateDetectionRole,
  isInputBlock,
  isOptionBlock,
  isRepeatableGroupBlock,
  isSongBlock,
  SETTING_SHEET_APPEARANCE_OPTIONS,
  SETTING_SHEET_BLOCK_OPTIONS,
  type SettingSheetBlock,
  type SettingSheetOptionSource,
} from '../types/live-types';

interface BlockSettingsPanelProps {
  block: SettingSheetBlock;
  index: number;
  parentId: string | null;
  depth: number;
  optionSourceCandidates: Array<{ value: string; label: string }>;
  onInsert: (parentId: string | null, insertIndex: number, type: SettingSheetBlock['type']) => void;
  onUpdateBlock: (blockId: string, patch: Partial<SettingSheetBlock>) => void;
  onChangeType: (blockId: string, nextType: SettingSheetBlock['type']) => void;
  onApplyGroupAppearance: (blockId: string, appearance: SettingSheetBlock['appearance']) => void;
  onUpdateOptionSource: (blockId: string, source: SettingSheetOptionSource | null) => void;
  renderNestedBlock: (child: SettingSheetBlock, childIndex: number, nestedParentId: string | null, nestedDepth: number) => ReactNode;
}

export const BlockSettingsPanel = ({
  block,
  depth,
  optionSourceCandidates,
  onInsert,
  onUpdateBlock,
  onChangeType,
  onApplyGroupAppearance,
  onUpdateOptionSource,
  renderNestedBlock,
}: BlockSettingsPanelProps) => {
  const usesOptions = isOptionBlock(block.type);
  const usesRequired = isInputBlock(block.type) || isRepeatableGroupBlock(block.type);
  const usesChildren = canContainBlocks(block.type);
  const titleSourceCandidates = isRepeatableGroupBlock(block.type) ? collectTitleSourceCandidates(block.fields) : [];
  const sharedChildAppearance = resolveSharedChildAppearance(block);

  return (
    <>
      <Accordion type="multiple" defaultValue={["basic"]} className="space-y-2">
        <AccordionItem value="basic" className="rounded-xl border px-3">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">基本設定</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">入力タイプ</p>
                <Select value={block.type} onValueChange={(value) => onChangeType(block.id, value as SettingSheetBlock['type'])}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTING_SHEET_BLOCK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">見出し</p>
                <Input value={block.label} onChange={(event) => onUpdateBlock(block.id, { label: event.target.value })} className="mt-1" />
              </div>
              <div className="lg:col-span-2">
                <p className="text-xs text-muted-foreground">説明</p>
                <Input value={block.description} onChange={(event) => onUpdateBlock(block.id, { description: event.target.value })} className="mt-1" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="appearance" className="rounded-xl border px-3">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">表示・必須設定</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">見た目</p>
                <Select value={block.appearance} onValueChange={(value) => onUpdateBlock(block.id, { appearance: value as SettingSheetBlock['appearance'] })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTING_SHEET_APPEARANCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">横幅</p>
                <Select value={block.layout.width} onValueChange={(value) => onUpdateBlock(block.id, { layout: { ...block.layout, width: value as SettingSheetBlock['layout']['width'] } })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {widthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {usesOptions ? (
                <div>
                  <p className="text-xs text-muted-foreground">選択肢カラム数</p>
                  <Select value={String(block.layout.optionColumns)} onValueChange={(value) => onUpdateBlock(block.id, { layout: { ...block.layout, optionColumns: Number(value) } })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {optionColumnOptions.map((count) => (
                        <SelectItem key={count} value={String(count)}>{count}列</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {usesRequired ? (
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Checkbox checked={block.required} onCheckedChange={(checked) => onUpdateBlock(block.id, { required: checked === true })} />
                    この質問を必須にする
                  </div>
                </div>
              ) : null}
              <div className="lg:col-span-2 rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center gap-3 text-sm">
                  <Checkbox checked={block.hidden} onCheckedChange={(checked) => onUpdateBlock(block.id, { hidden: checked === true })} />
                  今はこのブロックを公開フォームで非表示にする
                </div>
              </div>
              {!canContainBlocks(block.type) ? (
                <div className="lg:col-span-2 rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Checkbox checked={block.publicVisible === true} onCheckedChange={(checked) => onUpdateBlock(block.id, { publicVisible: checked === true })} />
                    共有・提出一覧でこの項目を表示する
                  </div>
                </div>
              ) : null}
              {isInputBlock(block.type) && !isSongBlock(block.type) ? (
                <div>
                  <p className="text-xs text-muted-foreground">曲かぶり検知の役割</p>
                  <Select value={block.duplicateDetectionRole || '__none__'} onValueChange={(value) => onUpdateBlock(block.id, { duplicateDetectionRole: (value === '__none__' ? '' : value) as DuplicateDetectionRole })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DUPLICATE_DETECTION_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value || '__none__'} value={option.value || '__none__'}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        {isRepeatableGroupBlock(block.type) ? (
          <AccordionItem value="group" className="rounded-xl border px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">繰り返しグループ設定</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">繰り返し項目の枠見た目</p>
                  <Select value={block.itemAppearance} onValueChange={(value) => onUpdateBlock(block.id, { itemAppearance: value as SettingSheetBlock['appearance'] })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTING_SHEET_APPEARANCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">項目タイトルの連動元</p>
                  <Select value={block.titleSourceFieldId || '__manual__'} onValueChange={(value) => onUpdateBlock(block.id, { titleSourceFieldId: value === '__manual__' ? '' : value })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">固定タイトルを使う</SelectItem>
                      {titleSourceCandidates.map((candidate) => (
                        <SelectItem key={candidate.value} value={candidate.value}>{candidate.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">子フィールド見た目を一括変更</p>
                  <Select value={sharedChildAppearance || '__mixed__'} onValueChange={(value) => {
                    if (value !== '__mixed__') {
                      onApplyGroupAppearance(block.id, value as SettingSheetBlock['appearance']);
                    }
                  }}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__mixed__" disabled>個別設定あり</SelectItem>
                      {SETTING_SHEET_APPEARANCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">追加ボタン文言</p>
                  <Input value={block.addButtonLabel} onChange={(event) => onUpdateBlock(block.id, { addButtonLabel: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">1件ごとの表示名</p>
                  <Input value={block.entryTitle} onChange={(event) => onUpdateBlock(block.id, { entryTitle: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">最小件数</p>
                  <Input type="number" min={0} value={block.minItems} onChange={(event) => onUpdateBlock(block.id, { minItems: Math.max(0, Number(event.target.value || 0)) })} className="mt-1" />
                </div>
                <div className="lg:col-span-2 rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Checkbox checked={block.collapsible} onCheckedChange={(checked) => onUpdateBlock(block.id, { collapsible: checked === true })} />
                    このグループを accordion として折り畳み可能にする
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {usesOptions ? <BlockOptionEditor block={block} optionSourceCandidates={optionSourceCandidates} onUpdateBlock={onUpdateBlock} onUpdateOptionSource={onUpdateOptionSource} /> : null}
        
        {usesChildren ? (
          <BlockChildrenEditor block={block} depth={depth} onInsert={onInsert} renderNestedBlock={renderNestedBlock} />
        ) : null}
      </Accordion>
    </>
  );
};
