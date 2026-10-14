/**
 * 数値の入力欄。打っている途中は文字のまま持ち、数として読めたときだけ値を渡す。
 * そのため「9」を消して空にしてから「5」と打ち直せる。空のまま離れたら元の値に戻し、
 * 範囲の外は離れたときに範囲へ収める。↑↓キーで step ずつ増減する。
 */
import { useState, type ComponentProps } from 'react';

import { Input } from '@/components/ui/input';

type InputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'min' | 'max' | 'step'>;

interface NumberInputProps extends InputProps {
  /** 空なら空欄で出す（複数選んで値がばらばらのときなど） */
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({ value, onValueChange, min, max, step = 1, onFocus, onBlur, onKeyDown, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft ?? format(value)}
      onFocus={(event) => {
        setDraft(format(value));
        onFocus?.(event);
      }}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const n = parse(text);
        if (n !== null && inRange(n)) onValueChange(n);
      }}
      onBlur={(event) => {
        const n = draft === null ? null : parse(draft);
        if (n !== null && clamp(n) !== value) onValueChange(clamp(n));
        setDraft(null);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          const base = parse(draft ?? '') ?? value ?? 0;
          const next = clamp(roundToStep(base + (event.key === 'ArrowUp' ? step : -step), step));
          setDraft(format(next));
          onValueChange(next);
        }
        onKeyDown?.(event);
      }}
    />
  );
}

function format(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? '' : String(value);
}

/** 全角の数字や記号も受け付ける。数として読めなければ null。 */
function parse(text: string): number | null {
  const normalized = text.trim().replace(/[０-９．－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace('ー', '-');
  if (normalized === '' || normalized === '-' || normalized === '.') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function roundToStep(value: number, step: number) {
  const digits = (String(step).split('.')[1] ?? '').length;
  return Number(value.toFixed(digits));
}
