import { type ReactNode } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { AddBlockMenu } from './AddBlockMenu';
import { isRepeatableGroupBlock, isSectionBlock, SETTING_SHEET_BLOCK_OPTIONS, type SettingSheetBlock, type SettingSheetGroupVariant } from '../types/live-types';

interface BlockChildrenEditorProps {
  block: SettingSheetBlock;
  depth: number;
  onInsert: (parentId: string | null, insertIndex: number, type: SettingSheetBlock['type']) => void;
  onUpdateBlock: (blockId: string, patch: Partial<SettingSheetBlock>) => void;
  renderNestedBlock: (child: SettingSheetBlock, childIndex: number, nestedParentId: string | null, nestedDepth: number) => ReactNode;
}

export const BlockChildrenEditor = ({ block, depth, onInsert, onUpdateBlock, renderNestedBlock }: BlockChildrenEditorProps) => {
  const variants = block.variants ?? [];
  const hasVariants = isRepeatableGroupBlock(block.type) && variants.length > 0;

  const addVariant = () => {
    const newVariant: SettingSheetGroupVariant = {
      id: `variant-${crypto.randomUUID().slice(0, 8)}`,
      label: '新しいバリアント',
      fields: [],
    };
    if (variants.length === 0 && block.fields.length > 0) {
      // 既存フィールドを最初のバリアントに移行してからバリアントモードに切り替え
      const migratedVariant: SettingSheetGroupVariant = {
        id: `variant-${crypto.randomUUID().slice(0, 8)}`,
        label: block.entryTitle || '項目',
        fields: block.fields,
      };
      onUpdateBlock(block.id, { variants: [migratedVariant, newVariant], fields: [] });
    } else {
      onUpdateBlock(block.id, { variants: [...variants, newVariant] });
    }
  };

  const removeVariant = (variantId: string) => {
    onUpdateBlock(block.id, { variants: variants.filter((v) => v.id !== variantId) });
  };

  const updateVariantLabel = (variantId: string, label: string) => {
    onUpdateBlock(block.id, {
      variants: variants.map((v) => (v.id === variantId ? { ...v, label } : v)),
    });
  };

  return (
      <AccordionItem value="fields" className="rounded-xl px-3 border">
        <AccordionTrigger className="py-2 text-sm hover:no-underline">
          {isSectionBlock(block.type) ? 'セクション内ブロック' : hasVariants ? 'バリアント定義' : 'グループ内フィールド'}
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-3">
          {hasVariants ? (
            <>
              <p className="text-xs text-muted-foreground">
                バリアントごとに異なるフィールドを定義できます。回答者は追加時にバリアントを選択します。
              </p>
              <Accordion type="multiple" className="space-y-3" defaultValue={variants[0] ? [variants[0].id] : []}>
                {variants.map((variant, variantIndex) => (
                  <AccordionItem key={variant.id} value={variant.id} className="rounded-lg border px-3">
                    <div className="flex items-center gap-2 py-2">
                      <AccordionTrigger className="min-w-0 flex-1 py-0 hover:no-underline">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-left">
                          <Badge variant="outline">バリアント {variantIndex + 1}</Badge>
                          <span className="min-w-0 truncate text-sm font-medium">{variant.label || '無題のバリアント'}</span>
                          <span className="text-xs text-muted-foreground">{variant.fields.length}件</span>
                        </div>
                      </AccordionTrigger>
                      <Button type="button" variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => removeVariant(variant.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <AccordionContent className="space-y-3 pb-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={variant.label}
                          onChange={(e) => updateVariantLabel(variant.id, e.target.value)}
                          className="h-8 text-sm font-medium"
                          placeholder="バリアント名"
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">({variant.id})</span>
                      </div>
                      <div className="space-y-3">
                        {variant.fields.map((child, childIndex) => (
                          <div key={child.id}>
                            {renderNestedBlock(child, childIndex, variant.id, depth + 1)}
                            <div className="mt-2 flex justify-end">
                              <AddBlockMenu
                                options={SETTING_SHEET_BLOCK_OPTIONS}
                                onSelect={(type) => onInsert(variant.id, childIndex + 1, type)}
                                buttonLabel="追加"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {variant.fields.length === 0 ? (
                        <div className="flex justify-end">
                          <AddBlockMenu
                            options={SETTING_SHEET_BLOCK_OPTIONS}
                            onSelect={(type) => onInsert(variant.id, 0, type)}
                            buttonLabel="フィールドを追加"
                          />
                        </div>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {isRepeatableGroupBlock(block.type) ? (
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="w-full">
                  <Plus className="mr-1 size-4" />バリアントを追加
                </Button>
              ) : null}
            </>
          ) : (
            <>
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
              {isRepeatableGroupBlock(block.type) ? (
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="mt-2 w-full">
                  <Plus className="mr-1 size-4" />バリアントモードに切り替える
                </Button>
              ) : null}
            </>
          )}
        </AccordionContent>
      </AccordionItem>
  );
};
