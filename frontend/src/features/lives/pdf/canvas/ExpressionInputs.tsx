/** Combined text inputs that include an expression snippet picker. The picker
 *  inserts at the current caret position (or appends if the input has never
 *  been focused). */
import { useRef } from 'react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FieldCatalog } from '../field-catalog';
import { ExpressionSnippetPicker } from './ExpressionSnippetPicker';

interface BaseProps {
  catalog: FieldCatalog;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

interface InputProps extends BaseProps {
  className?: string;
}

interface TextareaProps extends BaseProps {
  rows?: number;
  className?: string;
}

export function ExpressionTextarea({ catalog, value, onChange, rows = 3, placeholder, className }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const insert = (snippet: string) => insertAtCursor(ref.current, value, snippet, onChange);
  return (
    <div className="space-y-1">
      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`font-mono text-xs ${className ?? ''}`}
      />
      <div className="flex justify-end">
        <ExpressionSnippetPicker catalog={catalog} onInsert={insert} />
      </div>
    </div>
  );
}

export function ExpressionInput({ catalog, value, onChange, placeholder, className }: InputProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  const insert = (snippet: string) => insertAtCursor(ref.current, value, snippet, onChange);
  return (
    <div className="flex items-center gap-1">
      <Input
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 font-mono text-xs ${className ?? ''}`}
      />
      <ExpressionSnippetPicker catalog={catalog} onInsert={insert} size="icon" />
    </div>
  );
}

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  snippet: string,
  onChange: (next: string) => void,
): void {
  if (!el) {
    onChange(current + snippet);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + snippet + current.slice(end);
  onChange(next);
  // Restore caret to end of inserted text after React re-renders.
  requestAnimationFrame(() => {
    el.focus();
    const caret = start + snippet.length;
    el.setSelectionRange(caret, caret);
  });
}
