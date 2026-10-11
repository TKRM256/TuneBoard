/** 式の一覧から選んだ式を入れる。中身が置いたときの初期文字のままなら置き換え、
 *  それ以外はカーソルの位置に入れる（選んでいる文字があればそこを置き換える）。 */
import { useCallback, useRef } from 'react';
import type { EditorView } from '@codemirror/view';

/** テキスト要素を置いたときに入っている初期文字 */
const DEFAULT_TEXT_CONTENTS = new Set(['テキスト', 'タイトル']);

export function isUntouchedDefault(value: string): boolean {
  return DEFAULT_TEXT_CONTENTS.has(value.trim());
}

export function useSnippetInsert(value: string, onChange: (next: string) => void) {
  const viewRef = useRef<EditorView | null>(null);

  const onReady = useCallback((view: EditorView) => {
    viewRef.current = view;
  }, []);

  const insert = useCallback((snippet: string) => {
    if (isUntouchedDefault(value)) {
      onChange(snippet);
      return;
    }
    const view = viewRef.current;
    if (!view || view.state.doc.toString() !== value) {
      onChange(value + snippet);
      return;
    }
    const { from, to } = view.state.selection.main;
    view.dispatch({ changes: { from, to, insert: snippet }, selection: { anchor: from + snippet.length } });
  }, [value, onChange]);

  return { onReady, insert };
}
