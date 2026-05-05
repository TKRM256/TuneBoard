/** Wrappers around ExpressionEditor that match the API of the old
 *  plain-text Textarea/Input components so callers need no changes. */
import type { FieldCatalog } from '../field-catalog';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionEditorModal } from './ExpressionEditorModal';
import { ExpressionSnippetPicker } from './ExpressionSnippetPicker';

interface BaseProps {
  catalog: FieldCatalog;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Optional title shown in the expanded modal. */
  title?: string;
}

interface TextareaProps extends BaseProps {
  rows?: number;
  className?: string;
}

interface InputProps extends BaseProps {
  className?: string;
}

export function ExpressionTextarea({ catalog, value, onChange, rows = 3, placeholder, title, className }: TextareaProps) {
  return (
    <div className="space-y-1">
      <ExpressionEditor
        catalog={catalog}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        multiline
        rows={rows}
        className={`rounded-md border bg-background font-mono text-xs ${className ?? ''}`}
      />
      <div className="flex items-center justify-end gap-1">
        <ExpressionSnippetPicker catalog={catalog} onInsert={(s) => onChange(value + s)} />
        <ExpressionEditorModal catalog={catalog} value={value} onChange={onChange} title={title} />
      </div>
    </div>
  );
}

export function ExpressionInput({ catalog, value, onChange, placeholder, title, className }: InputProps) {
  return (
    <div className="flex items-center gap-1">
      <ExpressionEditor
        catalog={catalog}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        multiline={false}
        className={`flex-1 rounded-md border bg-background font-mono text-xs ${className ?? ''}`}
      />
      <ExpressionSnippetPicker catalog={catalog} onInsert={(s) => onChange(value + s)} size="icon" />
      <ExpressionEditorModal catalog={catalog} value={value} onChange={onChange} title={title} />
    </div>
  );
}
