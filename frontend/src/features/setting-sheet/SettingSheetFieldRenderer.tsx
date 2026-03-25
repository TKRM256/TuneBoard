import { Fragment } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
} from '@/features/lives/types/type';
import { cn } from '@/lib/utils';

import {
  cloneGroupItemValue,
  createGroupItemValue,
  createSettingSheetFieldValue,
  fieldIdFromKey,
  type SettingSheetFieldValue,
  type SettingSheetGroupItemValue,
} from './types';
import { appearanceClass, fieldWidthClass, formatGroupItemTitle, moveItem, optionLayoutClass } from './SettingSheetForm.helpers';

interface SettingSheetFieldRendererProps {
  block: SettingSheetBlock;
  scopedAnswers: Record<string, SettingSheetFieldValue>;
  pathPrefix: string;
  errorMap: Record<string, string>;
  resolveOptions: (block: SettingSheetBlock) => string[];
  setScopedAnswer: (blockId: string, nextValue: SettingSheetFieldValue) => void;
  updateScopedAnswers: (
    answers: Record<string, SettingSheetFieldValue>,
    blockId: string,
    nextValue: SettingSheetFieldValue,
  ) => Record<string, SettingSheetFieldValue>;
}

export const SettingSheetFieldRenderer = ({
  block,
  scopedAnswers,
  pathPrefix,
  errorMap,
  resolveOptions,
  setScopedAnswer,
  updateScopedAnswers,
}: SettingSheetFieldRendererProps) => {
  if (block.hidden) {
    return null;
  }

  const fieldValue = scopedAnswers[block.id] ?? createSettingSheetFieldValue(block);
  const pathKey = `${pathPrefix}${block.id}`;
  const inputId = fieldIdFromKey(pathKey);
  const values = fieldValue.values;
  const firstValue = values[0] ?? '';
  const options = isOptionBlock(block.type) ? resolveOptions(block) : [];

  if (isSectionBlock(block.type)) {
    return (
      <section className={`${appearanceClass(block.appearance, 'section')} ${fieldWidthClass(block.layout.width)}`}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{block.label}</h2>
        {block.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{block.description}</p> : null}
        {block.fields.length > 0 ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-6">
            {block.fields.map((child) => (
              <Fragment key={child.id}>
                <SettingSheetFieldRenderer
                  block={child}
                  scopedAnswers={scopedAnswers}
                  pathPrefix={pathPrefix}
                  errorMap={errorMap}
                  resolveOptions={resolveOptions}
                  setScopedAnswer={setScopedAnswer}
                  updateScopedAnswers={updateScopedAnswers}
                />
              </Fragment>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  if (isRepeatableGroupBlock(block.type)) {
    return (
      <SettingSheetGroupBlock
        block={block}
        errorMap={errorMap}
        fieldValue={fieldValue}
        pathKey={pathKey}
        resolveOptions={resolveOptions}
        setFieldValue={(nextValue) => setScopedAnswer(block.id, nextValue)}
        updateScopedAnswers={updateScopedAnswers}
      />
    );
  }

  return (
    <section className={`${appearanceClass(block.appearance, 'field')} ${fieldWidthClass(block.layout.width)}`}>
      {block.type === 'BOOLEAN' ? (
          <div className="flex items-center gap-3">
            <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
              {block.label}
              {block.required ? <span className="ml-1 text-destructive">*</span> : null}
            </Label>
            <Switch id={inputId} checked={values[0] === 'true'} onCheckedChange={(checked) => setScopedAnswer(block.id, toBooleanValue(checked))} />
          </div>
        ) : (
          <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {block.label}
            {block.required ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>
        )
      }
      {block.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{block.description}</p> : null}

      {block.type === 'SHORT_TEXT' ? (
        <Input id={inputId} value={firstValue} onChange={(event) => setScopedAnswer(block.id, toSingleValue(event.target.value))} className="mt-3" />
      ) : null}

      {block.type === 'LONG_TEXT' ? (
        <Textarea id={inputId} value={firstValue} onChange={(event) => setScopedAnswer(block.id, toSingleValue(event.target.value))} rows={5} className="mt-3" />
      ) : null}

      {block.type === 'SINGLE_SELECT' ? (
        <Select value={firstValue || undefined} onValueChange={(value) => setScopedAnswer(block.id, value ? { values: [value], items: [] } : emptyValue())}>
          <SelectTrigger id={inputId} className="mt-3 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : null}

      {block.type === 'MULTI_SELECT' || block.type === 'CHECKBOX' ? (
        <div id={inputId} className={`mt-3 ${optionLayoutClass(block.layout.optionColumns, block.layout.optionFitContent)}`}>
          {options.map((option) => {
            const checked = values.includes(option);
            return (
              <Label key={option} className={cn(
                'flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                block.layout.optionFitContent ? 'w-fit min-w-0' : '',
              )}>
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => setScopedAnswer(block.id, {
                    values: nextChecked === true ? [...values, option] : values.filter((value) => value !== option),
                    items: [],
                  })}
                />
                <span>{option}</span>
              </Label>
            );
          })}
          {options.length === 0 ? <p className="text-sm text-muted-foreground">まだ選択肢がありません。</p> : null}
        </div>
      ) : null}
      {errorMap[pathKey] ? <p className="mt-2 text-sm text-destructive">{errorMap[pathKey]}</p> : null}
    </section>
  );
};

interface SettingSheetGroupBlockProps {
  block: SettingSheetBlock;
  errorMap: Record<string, string>;
  fieldValue: SettingSheetFieldValue;
  pathKey: string;
  resolveOptions: (block: SettingSheetBlock) => string[];
  setFieldValue: (nextValue: SettingSheetFieldValue) => void;
  updateScopedAnswers: (
    answers: Record<string, SettingSheetFieldValue>,
    blockId: string,
    nextValue: SettingSheetFieldValue,
  ) => Record<string, SettingSheetFieldValue>;
}

const SettingSheetGroupBlock = ({
  block,
  errorMap,
  fieldValue,
  pathKey,
  resolveOptions,
  setFieldValue,
  updateScopedAnswers,
}: SettingSheetGroupBlockProps) => (
  <section className={`${appearanceClass(block.appearance, 'group')} ${fieldWidthClass(block.layout.width)}`}>
    <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 sm:pt-5 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="text-sm font-medium text-foreground">
          {block.label}
          {block.required ? <span className="ml-1 text-destructive">*</span> : null}
        </h2>
        {block.description ? <p className="mt-1 text-sm text-muted-foreground">{block.description}</p> : null}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: [...fieldValue.items, createGroupItemValue(block.fields)] })} className="w-full md:w-auto">
        <Plus className="size-4" />
        {block.addButtonLabel || '項目を追加'}
      </Button>
    </div>

    <AnimatePresence initial={false}>
      <motion.div layout className="space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {fieldValue.items.map((item, itemIndex) => (
          <SettingSheetGroupItem
            key={item.id}
            block={block}
            errorMap={errorMap}
            groupValue={fieldValue}
            item={item}
            itemIndex={itemIndex}
            pathKey={pathKey}
            resolveOptions={resolveOptions}
            setFieldValue={setFieldValue}
            updateScopedAnswers={updateScopedAnswers}
          />
        ))}
      </motion.div>
    </AnimatePresence>
    {fieldValue.items.length === 0 ? <p className="mx-4 mb-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground sm:mx-5 sm:mb-5">まだ入力項目がありません。追加ボタンから作成してください。</p> : null}
    {errorMap[`${pathKey}.items`] ? <p className="mt-3 text-sm text-destructive">{errorMap[`${pathKey}.items`]}</p> : null}
  </section>
);

interface SettingSheetGroupItemProps extends Omit<SettingSheetGroupBlockProps, 'fieldValue'> {
  groupValue: SettingSheetFieldValue;
  item: SettingSheetGroupItemValue;
  itemIndex: number;
}

const SettingSheetGroupItem = ({
  block,
  groupValue,
  item,
  itemIndex,
  pathKey,
  errorMap,
  resolveOptions,
  setFieldValue,
  updateScopedAnswers,
}: SettingSheetGroupItemProps) => {
  const itemTitle = resolveItemTitle(block, item, itemIndex);
  const updateItem = (nextItem: SettingSheetGroupItemValue) => {
    setFieldValue({
      values: [],
      items: groupValue.items.map((currentItem, index) => index === itemIndex ? nextItem : currentItem),
    });
  };

  const content = (
    <div className="grid gap-4 px-4 py-4 sm:px-5 xl:grid-cols-6">
      {block.fields.map((child) => (
        <SettingSheetFieldRenderer
          key={child.id}
          block={child}
          scopedAnswers={item.answers}
          pathPrefix={`${pathKey}.items[${itemIndex}].answers.`}
          errorMap={errorMap}
          resolveOptions={resolveOptions}
          setScopedAnswer={(childId, nextChildValue) => updateItem({
            ...item,
            answers: updateScopedAnswers(item.answers, childId, nextChildValue),
          })}
          updateScopedAnswers={updateScopedAnswers}
        />
      ))}
    </div>
  );

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className={appearanceClass(block.itemAppearance, 'group-item')}>
      {block.collapsible ? (
        <Accordion type="single" collapsible className="w-full" defaultValue={undefined}>
          <AccordionItem value={`${pathKey}-${item.id}`} className="border-none">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <AccordionTrigger className="min-w-0 flex-1 px-2 py-2 text-left hover:no-underline">
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold text-foreground">{itemTitle}</p>
                  </div>
                </AccordionTrigger>
                <GroupItemActions block={block} groupValue={groupValue} item={item} itemIndex={itemIndex} setFieldValue={setFieldValue} />
              </div>
            </div>
            <AccordionContent>{content}</AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <>
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{itemTitle}</p>
                <p className="text-xs text-muted-foreground">{block.entryTitle || '項目'} {itemIndex + 1}</p>
              </div>
              <GroupItemActions block={block} groupValue={groupValue} item={item} itemIndex={itemIndex} setFieldValue={setFieldValue} />
            </div>
          </div>
          {content}
        </>
      )}
    </motion.div>
  );
};

interface GroupItemActionsProps {
  block: SettingSheetBlock;
  groupValue: SettingSheetFieldValue;
  item: SettingSheetGroupItemValue;
  itemIndex: number;
  setFieldValue: (nextValue: SettingSheetFieldValue) => void;
}

const GroupItemActions = ({ block, groupValue, item, itemIndex, setFieldValue }: GroupItemActionsProps) => (
  <div className="grid grid-cols-2 gap-2 sm:flex">
    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: moveItem(groupValue.items, itemIndex, 'up') })} disabled={itemIndex === 0}>
      <ArrowUp className="size-4" />
      上へ
    </Button>
    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: moveItem(groupValue.items, itemIndex, 'down') })} disabled={itemIndex === groupValue.items.length - 1}>
      <ArrowDown className="size-4" />
      下へ
    </Button>
    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: [...groupValue.items, cloneGroupItemValue(block.fields, item)] })}>
      <Copy className="size-4" />
      複製
    </Button>
    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: groupValue.items.filter((_, index) => index !== itemIndex) })}>
      <Trash2 className="size-4" />
      削除
    </Button>
  </div>
);

function resolveItemTitle(block: SettingSheetBlock, item: SettingSheetGroupItemValue, itemIndex: number) {
  const fallback = `${block.entryTitle || '項目'} ${itemIndex + 1}`;
  if (!block.titleSourceFieldId) {
    return fallback;
  }

  const sourceBlock = block.fields.find((field) => field.id === block.titleSourceFieldId);
  const sourceValue = item.answers[block.titleSourceFieldId];
  if (!sourceBlock || !sourceValue) {
    return fallback;
  }

  const normalized = sourceValue.values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return fallback;
  }

  return formatGroupItemTitle(sourceBlock.type === 'MULTI_SELECT' ? normalized.join(' / ') : normalized[0]);
}

function emptyValue(): SettingSheetFieldValue {
  return { values: [], items: [] };
}

function toSingleValue(value: string): SettingSheetFieldValue {
  return value.trim() ? { values: [value], items: [] } : emptyValue();
}

function toBooleanValue(value: boolean): SettingSheetFieldValue {
  if (value === true || value === false) {
    return { values: [value.toString()], items: [] };
  }

  return emptyValue();
}