/** 管理者入力の 1 項目の入力欄。ブロックの種類に合わせて入力の形を変える。 */
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DurationField } from '@/features/setting-sheet/components/DurationField';

import type { SettingSheetBlock } from '../types/live-types';

const NONE = '__none__';

interface Props {
  block: SettingSheetBlock;
  inputId: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  /** 一覧の表の中で使うときは小さく出す */
  compact?: boolean;
}

export function AdminAnswerInput({ block, inputId, values, options, onChange, compact = false }: Props) {
  const first = values[0] ?? '';
  const single = (value: string) => onChange(value.trim() ? [value] : []);

  switch (block.type) {
    case 'SHORT_TEXT':
      return <Input id={inputId} value={first} onChange={(event) => single(event.target.value)} className={compact ? 'h-8' : ''} />;
    case 'LONG_TEXT':
      return compact
        ? <Input id={inputId} value={first} onChange={(event) => single(event.target.value)} className="h-8" />
        : <Textarea id={inputId} value={first} onChange={(event) => single(event.target.value)} rows={3} />;
    case 'SINGLE_SELECT':
      return (
        <Select value={first || NONE} onValueChange={(value) => onChange(value === NONE ? [] : [value])}>
          <SelectTrigger id={inputId} className={compact ? 'h-8 w-full' : 'w-full'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>（未選択）</SelectItem>
            {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'MULTI_SELECT':
    case 'CHECKBOX':
      return (
        <div id={inputId} className="flex flex-wrap gap-x-4 gap-y-2">
          {options.map((option) => (
            <Label key={option} className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={values.includes(option)}
                onCheckedChange={(checked) => onChange(checked === true
                  ? [...values, option]
                  : values.filter((value) => value !== option))}
              />
              {option}
            </Label>
          ))}
        </div>
      );
    case 'BOOLEAN':
      return (
        <Switch
          id={inputId}
          checked={first === 'true'}
          onCheckedChange={(checked) => onChange([checked ? 'true' : 'false'])}
        />
      );
    case 'DURATION':
      return <DurationField inputId={inputId} value={first} onChange={single} />;
    default:
      return <span className="text-xs text-muted-foreground">—</span>;
  }
}
