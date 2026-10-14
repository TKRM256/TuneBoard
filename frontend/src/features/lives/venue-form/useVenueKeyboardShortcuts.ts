/** 会場書式エディタのキー操作。入力欄で文字を打っているときや、画面の文字をなぞって選んでいるときは反応しない。
 *  Ctrl+C / X / V: コピー・切り取り・貼り付け
 *  Ctrl+Shift+V: 次の件として貼り付け（items[N] を 1 つ進めて真下に置く。罫線の枠の中なら下の枠に置く）
 *  Ctrl+D: 複製 / Ctrl+A: ページの要素を全部選ぶ / Ctrl+Z, Ctrl+Y: 元に戻す・やり直す
 *  矢印: 0.5mm 移動（Shift で 5mm） / Delete: 削除 / Esc: 選択を外す */
import { useEffect } from 'react';

import { boxInNextRow } from './assist/cell-fit';
import type { PageLine } from './assist/ruled-lines';
import type { VenueFormEditor } from './useVenueFormEditor';

const NUDGE_MM = 0.5;

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)));
}

/** 画面上の文字（エラー文など）が範囲選択されているか。そのときのコピーはブラウザに任せる。 */
function hasTextSelection() {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

export function useVenueKeyboardShortcuts(editor: VenueFormEditor, lines: PageLine[]) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      // ダイアログが開いているときは、背後のエディタを動かさない
      if (document.querySelector('[role="dialog"]')) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const hasSelection = editor.selectedIds.size > 0;

      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        editor.redo();
        return;
      }
      if (mod && key === 'v') {
        event.preventDefault();
        if (event.shiftKey) editor.paste('next', (box) => boxInNextRow(box, lines));
        else editor.paste('same');
        return;
      }
      if (mod && (key === 'a' || key === 'c' || key === 'x') && hasTextSelection()) return;
      if (mod && key === 'a') {
        event.preventDefault();
        editor.selectAllOnPage();
        return;
      }
      if (!hasSelection) return;
      if (mod && (key === 'c' || key === 'x')) {
        event.preventDefault();
        editor.copySelected();
        if (key === 'x') editor.removeSelected();
        return;
      }
      if (mod && key === 'd') {
        event.preventDefault();
        editor.duplicateSelected();
        return;
      }
      if (event.key === 'Escape') {
        editor.select(null, false);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        editor.removeSelected();
        return;
      }
      const step = event.shiftKey ? NUDGE_MM * 10 : NUDGE_MM;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        editor.moveSelected(move[0], move[1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, lines]);
}
