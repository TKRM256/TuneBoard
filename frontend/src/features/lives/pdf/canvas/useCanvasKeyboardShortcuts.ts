/** Wires keyboard shortcuts into the canvas editor. Skips events that originate
 *  from form inputs so typing in property fields isn't intercepted. */
import { useEffect } from 'react';

import type { CanvasEditor } from './useCanvasEditor';

export function useCanvasKeyboardShortcuts(editor: CanvasEditor): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedIds.size > 0) {
          e.preventDefault();
          editor.remove();
        }
      } else if (e.key === 'Escape') {
        editor.select(null, false);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        editor.redo();
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        editor.undo();
      } else if (e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        editor.redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        editor.duplicate();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        editor.selectAll();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        editor.nudge(0, e.shiftKey ? -5 : -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        editor.nudge(0, e.shiftKey ? 5 : 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        editor.nudge(e.shiftKey ? -5 : -1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        editor.nudge(e.shiftKey ? 5 : 1, 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor]);
}
