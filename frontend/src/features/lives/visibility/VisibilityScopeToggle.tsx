/** 1項目 × 1表示先のON/OFFボタン。 */
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';

import { VISIBILITY_OFF_CLASS_NAME, type VisibilityScope } from './visibility-scopes';

interface VisibilityScopeToggleProps {
  scope: VisibilityScope;
  visible: boolean;
  label: string;
  onChange: (visible: boolean) => void;
}

export const VisibilityScopeToggle = ({ scope, visible, label, onChange }: VisibilityScopeToggleProps) => (
  <button
    type="button"
    aria-pressed={visible}
    aria-label={`${label} / ${scope.label}: ${visible ? '表示' : '非表示'}`}
    title={`${scope.label} — ${scope.description}`}
    onClick={() => onChange(!visible)}
    className={cn(
      'flex h-8 min-w-0 flex-1 items-center justify-center gap-0.5 whitespace-nowrap rounded-lg border px-1 text-[11px] font-medium transition-colors sm:gap-1 sm:text-xs',
      // スマホは3等分して列名を添える。PCは列見出しがあるのでアイコンだけの固定幅にする
      'sm:h-7 sm:w-20 sm:flex-none',
      visible ? scope.onClassName : VISIBILITY_OFF_CLASS_NAME,
    )}
  >
    {visible ? <Eye className="size-3 shrink-0 sm:size-3.5" /> : <EyeOff className="size-3 shrink-0 sm:size-3.5" />}
    <span className="sm:hidden">{scope.label}</span>
  </button>
);
