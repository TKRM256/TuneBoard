/** CodeMirror 6 based expression editor with:
 *  - JavaScript-style syntax highlighting (closest to JEXL)
 *  - UUID → readable label chip overlay (click/cursor reveals raw UUID)
 *  - Autocomplete from the FieldCatalog (fields, groups, helpers)
 *  - Single-line mode (default) or multi-line textarea mode with proper
 *    code-editor UX (Tab indentation, bracket auto-close, indent-on-input) */
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import ReactCodeMirror from '@uiw/react-codemirror';

import type { FieldCatalog } from '../field-catalog';
import { makeCatalogCompletionSource } from './expression-completions';
import { uuidLabelDecoration } from './uuid-label-decoration';

interface Props {
  catalog: FieldCatalog;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  /** 親の高さいっぱいに広げる（拡大編集モーダル用）。rows より優先される。 */
  fillHeight?: boolean;
  className?: string;
}

const SINGLE_LINE_EXTENSIONS = [
  Prec.high(keymap.of([{ key: 'Enter', run: () => true }])),
];

const MULTI_LINE_EXTENSIONS = [
  keymap.of([indentWithTab]),
];

export function ExpressionEditor({ catalog, value, onChange, placeholder, multiline = false, rows = 3, fillHeight = false, className }: Props) {
  const extensions = [
    javascript({ jsx: false }),
    autocompletion({ override: [makeCatalogCompletionSource(catalog)], closeOnBlur: true }),
    EditorView.lineWrapping,
    uuidLabelDecoration(catalog),
    ...(multiline ? MULTI_LINE_EXTENSIONS : SINGLE_LINE_EXTENSIONS),
  ];

  const minHeight = fillHeight ? '100%' : multiline ? `${rows * 1.6}rem` : '2rem';
  const maxHeight = fillHeight ? '100%' : multiline ? `${rows * 4}rem` : '2.5rem';

  return (
    <ReactCodeMirror
      value={value}
      onChange={(val) => onChange(val)}
      extensions={extensions}
      placeholder={placeholder}
      theme="none"
      basicSetup={{
        lineNumbers: multiline,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: multiline,
        highlightActiveLine: multiline,
        highlightSelectionMatches: multiline,
        closeBrackets: multiline,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLineGutter: multiline,
      }}
      className={`expression-editor ${multiline ? 'expression-editor--multi' : 'expression-editor--single'} ${className ?? ''}`}
      minHeight={minHeight}
      maxHeight={maxHeight}
    />
  );
}
