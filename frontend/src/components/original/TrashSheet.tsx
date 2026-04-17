import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TrashItem {
  id: string;
  label: string;
}

interface TrashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: TrashItem[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  entityLabel: string;
}

export const TrashSheet = ({ open, onOpenChange, items, onRestore, onPurge, entityLabel }: TrashSheetProps) => {
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const confirmTarget = items.find((i) => i.id === confirmPurgeId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Trash2 className="size-4" />
              ゴミ箱
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              削除された{entityLabel}は30日後に完全削除されます
            </p>
          </SheetHeader>

          <div className="mt-4 space-y-2 overflow-y-auto px-4 pb-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <Trash2 className="size-8 opacity-30" />
                <p className="text-sm">ゴミ箱は空です</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
                >
                  <span className="truncate pr-2 text-sm">{item.label}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => onRestore(item.id)}
                    >
                      <RotateCcw className="mr-1 size-3" />
                      復元
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmPurgeId(item.id)}
                    >
                      <Trash2 className="mr-1 size-3" />
                      完全削除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmPurgeId !== null} onOpenChange={(o) => { if (!o) setConfirmPurgeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>完全に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{confirmTarget?.label}」を完全に削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmPurgeId) {
                  onPurge(confirmPurgeId);
                  setConfirmPurgeId(null);
                }
              }}
            >
              完全に削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface TrashButtonProps {
  onClick: () => void;
  count?: number;
}

export const TrashButton = ({ onClick, count }: TrashButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-8 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      title="ゴミ箱"
    >
      <Trash2 className="size-4" />
      {count != null && count > 0 && (
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  );
};
