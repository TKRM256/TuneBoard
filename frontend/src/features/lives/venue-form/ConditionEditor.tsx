/** 要素の表示条件。式を直接書くか、「かんたん設定」で項目と比べ方を選んで式を作る。 */
import { useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import { ExpressionInput } from '../canvas-shared/expression/ExpressionInputs';
import type { SettingSheetBlock } from '../types/live-types';
import {
  buildCondition,
  CONDITION_OPERATOR_LABELS,
  operatorsFor,
  type ConditionOperator,
} from './condition-builder';

interface Props {
  catalog: FieldCatalog;
  blocksById: Map<string, SettingSheetBlock>;
  value: string;
  onChange: (next: string) => void;
}

interface Target {
  key: string;
  fieldId: string;
  groupId: string | null;
  label: string;
}

export function ConditionEditor({ catalog, blocksById, value, onChange }: Props) {
  const targets: Target[] = [
    ...catalog.fields.map((field) => ({ key: `|${field.id}`, fieldId: field.id, groupId: null, label: field.pathLabel })),
    ...catalog.groups.flatMap((group) => group.fields.map((field) => ({
      key: `${group.id}|${field.id}`,
      fieldId: field.id,
      groupId: group.id,
      label: `${field.pathLabel}（いずれかの件）`,
    }))),
  ].filter((target) => blocksById.get(target.fieldId)?.type !== 'STAGE_PLOT');

  const [targetKey, setTargetKey] = useState('');
  const [operator, setOperator] = useState<ConditionOperator | ''>('');
  const [operand, setOperand] = useState('');
  const target = targets.find((t) => t.key === targetKey);
  const block = target ? blocksById.get(target.fieldId) : undefined;
  const operators = block ? operatorsFor(block.type) : [];
  const effectiveOperator = operator && operators.includes(operator) ? operator : operators[0];
  const needsValue = effectiveOperator === 'includes' || effectiveOperator === 'equals';
  const options = block && block.type !== 'SHORT_TEXT' && block.type !== 'LONG_TEXT' ? block.options : [];

  const apply = () => {
    if (!target || !effectiveOperator) return;
    onChange(buildCondition({ fieldId: target.fieldId, groupId: target.groupId, operator: effectiveOperator, value: operand }));
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">表示条件</Label>
        {value ? (
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11px]" onClick={() => onChange('')}>
            <X className="size-3" />条件を外す
          </Button>
        ) : null}
      </div>
      <ExpressionInput catalog={catalog} value={value} onChange={onChange} placeholder="空なら常に表示" title="表示条件" />
      <details className="rounded-md border p-2">
        <summary className="cursor-pointer text-xs">かんたん設定</summary>
        <div className="mt-2 space-y-2">
          <Select value={targetKey} onValueChange={(next) => { setTargetKey(next); setOperator(''); setOperand(''); }}>
            <SelectTrigger className="h-8 w-full min-w-0 text-xs [&>span]:truncate"><SelectValue placeholder="項目を選ぶ" /></SelectTrigger>
            <SelectContent>
              {targets.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {target ? (
            <Select value={effectiveOperator ?? ''} onValueChange={(next) => setOperator(next as ConditionOperator)}>
              <SelectTrigger className="h-8 w-full min-w-0 text-xs [&>span]:truncate"><SelectValue /></SelectTrigger>
              <SelectContent>
                {operators.map((op) => <SelectItem key={op} value={op}>{CONDITION_OPERATOR_LABELS[op]}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
          {target && needsValue ? (
            options.length > 0 ? (
              <Select value={operand} onValueChange={setOperand}>
                <SelectTrigger className="h-8 w-full min-w-0 text-xs [&>span]:truncate"><SelectValue placeholder="選択肢を選ぶ" /></SelectTrigger>
                <SelectContent>
                  {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={operand} onChange={(event) => setOperand(event.target.value)} placeholder="比べる値" className="h-8 text-xs" />
            )
          ) : null}
          <Button size="sm" className="w-full" onClick={apply} disabled={!target || (needsValue && !operand)}>
            この条件にする
          </Button>
        </div>
      </details>
    </div>
  );
}
