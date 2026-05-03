/** YAML DSL editor with CodeMirror syntax highlighting, autocomplete, and an
 *  insertable variables popover. */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Sparkles, Variable as VariableIcon } from 'lucide-react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { yaml as yamlLanguage } from '@codemirror/lang-yaml';
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SettingSheetConfigResponse } from '../types/live-types';
import { buildVariableGroups, type VariableEntry } from './dsl-variables';

export interface DslError {
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

interface Props {
  config: SettingSheetConfigResponse | null;
  yaml: string;
  onChange: (yaml: string) => void;
  error: DslError | null;
  onExportFromSimple: () => void;
}

const editorTheme = EditorView.theme({
  '&': { fontSize: '12px', height: '100%' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", "Source Code Pro", Menlo, Consolas, monospace' },
  '.cm-content': { padding: '8px 0' },
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid #e5e7eb' },
  '.cm-line': { padding: '0 8px' },
});

export function DslEditor({ config, yaml, onChange, error, onExportFromSimple }: Props) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const variableGroups = useMemo(() => buildVariableGroups(config), [config]);

  const completionSource = useCallback((ctx: CompletionContext) => {
    // Trigger completion when inside `${...}` (after the `${` opening token).
    const docStr = ctx.state.doc.sliceString(0, ctx.pos);
    const lastOpen = docStr.lastIndexOf('${');
    if (lastOpen < 0) return null;
    const lastClose = docStr.lastIndexOf('}');
    if (lastClose > lastOpen) return null; // already closed before cursor
    const afterDollar = ctx.state.doc.sliceString(lastOpen + 2, ctx.pos);
    if (afterDollar.includes('}')) return null;

    const options: Completion[] = [];
    for (const group of variableGroups) {
      for (const entry of group.entries) {
        if (entry.heading) continue;
        const inner = stripWrap(entry.insert);
        if (!inner) continue;
        options.push({
          label: inner,
          detail: entry.hint ?? group.title,
          type: 'variable',
          apply: inner,
        });
      }
    }
    return {
      from: lastOpen + 2,
      to: ctx.pos,
      options,
      validFor: /^[\w.[\]'(),:! ]*$/,
    };
  }, [variableGroups]);

  const extensions = useMemo(() => [
    yamlLanguage(),
    autocompletion({ override: [completionSource], activateOnTyping: true }),
    editorTheme,
    EditorView.lineWrapping,
  ], [completionSource]);

  const insertAtCursor = useCallback((snippet: string) => {
    const view = editorRef.current?.view;
    if (!view) {
      onChange(yaml + snippet);
      return;
    }
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length },
    });
    view.focus();
  }, [yaml, onChange]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          YAML レイアウト
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onExportFromSimple} className="h-7 gap-1 text-xs">
            <Sparkles className="size-3.5" />
            雛形を再生成
          </Button>
          <Popover open={variablesOpen} onOpenChange={setVariablesOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <VariableIcon className="size-3.5" />
                変数を挿入
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="border-b px-3 py-2 text-xs">
                <div className="font-semibold">変数を挿入</div>
                <div className="text-[11px] text-muted-foreground">クリックでカーソル位置に貼り付け</div>
              </div>
              <ScrollArea className="h-[420px]">
                <div className="space-y-3 p-2">
                  {variableGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                      <div className="px-1 text-xs font-semibold text-muted-foreground">
                        {group.icon} {group.title}
                      </div>
                      {group.entries.map((entry, i) => (
                        <VariableRow
                          key={`${group.title}-${i}`}
                          entry={entry}
                          onClick={(s) => { insertAtCursor(s); setVariablesOpen(false); }}
                        />
                      ))}
                    </div>
                  ))}
                  <p className="px-1 pt-2 text-[10px] leading-snug text-muted-foreground">
                    ヒント: <code>for-each</code> の中では <code>as:</code> で指定した名前 (例 <code>m</code>) で参照
                  </p>
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={yaml}
          onChange={onChange}
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            tabSize: 2,
          }}
          placeholder={'page:\n  size: A4\nrows: []'}
          height="100%"
          className="h-full overflow-auto"
        />
      </div>

      {error ? (
        <div className="border-t border-destructive/40 bg-destructive/5 p-2 text-xs">
          <div className="font-semibold text-destructive">レイアウトエラー</div>
          <div className="mt-0.5 whitespace-pre-wrap break-words text-foreground">{error.message}</div>
          {(error.line !== undefined || error.path) ? (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {error.line !== undefined ? `行 ${error.line}${error.column !== undefined ? `, 列 ${error.column}` : ''}` : null}
              {error.path ? `  path: ${error.path}` : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function stripWrap(insert: string): string {
  // Remove `${` prefix and trailing `}` from snippet to insert just the expression body.
  if (insert.startsWith('${') && insert.endsWith('}')) {
    return insert.slice(2, -1);
  }
  return insert;
}

function VariableRow({ entry, onClick }: { entry: VariableEntry; onClick: (insert: string) => void }) {
  if (entry.heading) {
    return (
      <div
        className="px-1 pt-1 text-[11px] font-medium text-muted-foreground"
        style={{ paddingLeft: 4 + entry.depth * 8 }}
      >
        {entry.label}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onClick(entry.insert)}
      className="block w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
      style={{ paddingLeft: 8 + entry.depth * 8 }}
    >
      <div className="truncate font-mono text-[11px] text-foreground">{entry.label}</div>
      {entry.hint ? (
        <div className="truncate text-[10px] text-muted-foreground">{entry.hint}</div>
      ) : null}
    </button>
  );
}
