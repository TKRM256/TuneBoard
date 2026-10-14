/** 設定を編集するページの保存ボタン。画面の下に貼り付け、スクロールしても常に押せるようにする。 */
import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface SaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  /** チュートリアルで指す目印 */
  dataTour?: string;
}

export function SaveBar({ isDirty, isSaving, onSave, dataTour }: SaveBarProps) {
  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 rounded-xl border bg-background/95 px-3 py-2 backdrop-blur">
      {isDirty ? <p className="text-xs text-muted-foreground">未保存の変更があります</p> : null}
      <Button onClick={onSave} disabled={isSaving || !isDirty} className="shrink-0" data-tour={dataTour}>
        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {isSaving ? '保存中...' : '保存する'}
      </Button>
    </div>
  );
}
