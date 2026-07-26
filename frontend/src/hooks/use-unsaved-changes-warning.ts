/**
 * 保存していない変更があるまま画面を離れようとしたときの確認。
 *
 * タブを閉じる・リロードはブラウザ標準の確認しか出せないので beforeunload に任せ、
 * ブラウザバックやアプリ内の遷移は useBlocker でせき止めて、
 * 呼び出し側がアプリ内のダイアログで確認できるように状態を返す。
 */
import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export interface UnsavedChangesGuard {
  /** 遷移をせき止めている＝確認ダイアログを出すべき状態か。 */
  isBlocked: boolean;
  /** 変更を破棄して遷移する。 */
  confirmLeave: () => void;
  /** 遷移を取りやめてこの画面に留まる。 */
  cancelLeave: () => void;
}

export function useUnsavedChangesWarning(isDirty: boolean): UnsavedChangesGuard {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 古いブラウザ向け。表示される文言はブラウザ側が決める。
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  return {
    isBlocked: blocker.state === 'blocked',
    confirmLeave: () => blocker.proceed?.(),
    cancelLeave: () => blocker.reset?.(),
  };
}
