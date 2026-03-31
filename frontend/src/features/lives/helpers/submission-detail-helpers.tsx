/** Helper functions for rendering submission detail blocks, formatting dates and values. */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  isSectionBlock,
  isRepeatableGroupBlock,
  getGroupItemFields,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetSubmissionAnswerResponse,
} from '../types/live-types';

export function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatAnswerValue(values: string[], blockType: SettingSheetBlock['type']) {
  if (values.length === 0) {
    return '未入力';
  }
  if (blockType === 'BOOLEAN') {
    return values[0] === 'true' ? 'はい' : values[0] === 'false' ? 'いいえ' : values.join(' / ');
  }
  return values.join(' / ');
}

function resolveItemTitle(
  block: SettingSheetBlock,
  itemAnswers: SettingSheetSubmissionAnswerResponse[],
  itemIndex: number,
) {
  if (block.titleSourceFieldId) {
    const source = itemAnswers.find((a) => a.fieldId === block.titleSourceFieldId);
    if (source && source.values.length > 0 && source.values[0].trim()) {
      return source.values[0].trim();
    }
  }
  return `${block.entryTitle || block.label} ${itemIndex + 1}`;
}

export function renderSubmissionBlocks(
  blocks: SettingSheetBlock[],
  answers: PublicSettingSheetSubmissionDetailResponse['answers'],
  path: string,
) {
  const answerMap = new Map(answers.map((a) => [a.fieldId, a]));

  return blocks.map((block, index) => {
    const key = `${path}-${block.id}-${index}`;
    const answer = answerMap.get(block.id);

    if (isSectionBlock(block.type)) {
      return (
        <Accordion key={key} type="single" collapsible defaultValue={`${key}-open`}>
          <AccordionItem value={`${key}-open`} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="text-left">
                <p className="text-sm font-semibold sm:text-base">{block.label}</p>
                {block.description ? <p className="mt-0.5 text-xs text-muted-foreground">{block.description}</p> : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {block.fields.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">{renderSubmissionBlocks(block.fields, answers, key)}</div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    if (isRepeatableGroupBlock(block.type)) {
      const items = answer?.items ?? [];
      return (
        <div key={key} className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{block.label}</p>
            <Badge variant="outline">{items.length}件</Badge>
          </div>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">未入力</p>
          ) : block.collapsible ? (
            <Accordion type="single" collapsible className="space-y-2">
              {items.map((item, itemIndex) => {
                const itemTitle = resolveItemTitle(block, item.answers, itemIndex);
                return (
                  <AccordionItem key={`${key}-item-${itemIndex}`} value={`${key}-item-${itemIndex}`} className="rounded-lg border">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <span className="text-sm font-medium">{itemTitle}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid gap-3 sm:grid-cols-2">{renderSubmissionBlocks(getGroupItemFields(block, item.variantId ?? ''), item.answers, `${key}-item-${itemIndex}`)}</div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="space-y-3">
              {items.map((item, itemIndex) => (
                <div key={`${key}-item-${itemIndex}`} className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{resolveItemTitle(block, item.answers, itemIndex)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">{renderSubmissionBlocks(getGroupItemFields(block, item.variantId ?? ''), item.answers, `${key}-item-${itemIndex}`)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1 rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground">{block.label}</p>
        <p className="whitespace-pre-wrap wrap-break-word text-sm font-medium leading-6">{formatAnswerValue(answer?.values ?? [], block.type)}</p>
      </div>
    );
  });
}
