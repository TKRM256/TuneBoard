/** useUnsavedChangesWarning がせき止めた遷移を、アプリ内ダイアログで確認する。 */
import type { UnsavedChangesGuard } from '@/hooks/use-unsaved-changes-warning';

import { ConfirmDialog } from './ConfirmDialog';

export const UnsavedChangesDialog = ({ guard }: { guard: UnsavedChangesGuard }) => (
  <ConfirmDialog
    open={guard.isBlocked}
    onOpenChange={(open) => {
      if (!open) {
        guard.cancelLeave();
      }
    }}
    title="保存していない変更があります"
    description="このまま移動すると、保存していない変更は失われます。"
    confirmLabel="破棄して移動"
    cancelLabel="このページに留まる"
    destructive
    onConfirm={guard.confirmLeave}
  />
);
