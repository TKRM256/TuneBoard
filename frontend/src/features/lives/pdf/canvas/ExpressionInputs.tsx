/** Wrappers around ExpressionEditor that match the API of the old
 *  plain-text Textarea/Input components so callers need no changes. */
import type { FieldCatalog } from '../field-catalog';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionEditorModal } from './ExpressionEditorModal';
import { ExpressionPreviewLine } from './ExpressionPreviewLine';
import type { ExpressionRowScope } from './ExpressionPreviewContext';
import { ExpressionSnippetPicker } from './ExpressionSnippetPicker';

interface BaseProps {
  catalog: FieldCatalog;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Optional title shown in the expanded modal. */
  title?: string;
  /** 行ごとに評価される書式の場合、見本行を決めるためのスコープ。 */
  scope?: ExpressionRowScope;
}

interface TextareaProps extends BaseProps {
  rows?: number;
  className?: string;
}

interface InputProps extends BaseProps {
  className?: string;
}

export function ExpressionTextarea({ catalog, value, onChange, rows = 3, placeholder, title, scope, className }: TextareaProps) {
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
      <ExpressionPreviewLine expression={value} scope={scope} />
      <div className="flex items-center justify-end gap-1">
        <ExpressionSnippetPicker catalog={catalog} onInsert={(s) => onChange(value + s)} />
        <ExpressionEditorModal catalog={catalog} value={value} onChange={onChange} title={title} scope={scope} />
      </div>
    </div>
  );
}

export function ExpressionInput({ catalog, value, onChange, placeholder, title, scope, className }: InputProps) {
  return (
    <div className="space-y-1">
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
        <ExpressionEditorModal catalog={catalog} value={value} onChange={onChange} title={title} scope={scope} />
      </div>
      <ExpressionPreviewLine expression={value} scope={scope} />
    </div>
  );
}
