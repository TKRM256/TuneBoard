import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { SettingSheetBlock, SettingSheetOptionSource } from '../types/live-types';

interface BlockOptionEditorProps {
  block: SettingSheetBlock;
  optionSourceCandidates: Array<{ value: string; label: string }>;
  onUpdateBlock: (blockId: string, patch: Partial<SettingSheetBlock>) => void;
  onUpdateOptionSource: (blockId: string, source: SettingSheetOptionSource | null) => void;
}

export const BlockOptionEditor = ({ block, optionSourceCandidates, onUpdateBlock, onUpdateOptionSource }: BlockOptionEditorProps) => {
  const currentSourceValue = block.optionSource ? `${block.optionSource.blockId}:${block.optionSource.fieldId}` : '';

  return (
      <AccordionItem value="options" className="rounded-xl border px-3">
        <AccordionTrigger className="py-2 text-sm hover:no-underline">選択肢設定</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <div>
            <Select
              value={currentSourceValue || '__manual__'}
              onValueChange={(value) => onUpdateOptionSource(block.id, value === '__manual__' ? null : { blockId: value.split(':')[0], fieldId: value.split(':')[1] })}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">手動で入力する</SelectItem>
                {optionSourceCandidates.map((candidate) => (
                  <SelectItem key={candidate.value} value={candidate.value}>{candidate.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border border-dashed p-3">
            <div className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={block.layout.optionFitContent}
                onCheckedChange={(checked) => onUpdateBlock(block.id, { layout: { ...block.layout, optionFitContent: checked === true } })}
              />
              複数選択の選択肢を文字幅に合わせて詰める
            </div>
          </div>
          {!block.optionSource ? (
            <div>
              <Textarea
                value={block.options.join('\n')}
                onChange={(event) => {
                  onUpdateBlock(block.id, { options: event.target.value.split(/\r?\n/) });
                }}
                rows={5}
                className="mt-1"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">回答時に参照元フィールドの値から選択肢を生成</p>
          )}
        </AccordionContent>
      </AccordionItem>
  );
};
