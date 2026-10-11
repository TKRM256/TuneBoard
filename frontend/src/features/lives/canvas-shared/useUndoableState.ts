/** 元に戻す / やり直しができる状態。commit で履歴に積み、replace は履歴を消して置き換える。 */
import { useCallback, useRef, useState } from 'react';

const HISTORY_LIMIT = 100;

export interface UndoableState<T> {
  value: T;
  /** 常に最新の値（連続した操作で古い値を元に計算しないため） */
  current: () => T;
  commit: (next: T) => void;
  replace: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoableState<T>(initial: T): UndoableState<T> {
  const [value, setValue] = useState(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const ref = useRef(initial);

  const commit = useCallback((next: T) => {
    const previous = ref.current;
    if (next === previous) return;
    ref.current = next;
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), previous]);
    setFuture([]);
    setValue(next);
  }, []);

  const replace = useCallback((next: T) => {
    ref.current = next;
    setPast([]);
    setFuture([]);
    setValue(next);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const now = ref.current;
    ref.current = previous;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, now]);
    setValue(previous);
  }, [past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const now = ref.current;
    ref.current = next;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, now]);
    setValue(next);
  }, [future]);

  const current = useCallback(() => ref.current, []);

  return { value, current, commit, replace, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
