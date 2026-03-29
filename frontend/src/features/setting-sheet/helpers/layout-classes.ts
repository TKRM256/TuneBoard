import type { SettingSheetBlock } from '@/features/lives/types/live-types';

export const optionLayoutClass = (columnCount: number, fitContent: boolean) => {
  if (fitContent) {
    return 'flex flex-wrap gap-2';
  }
  if (columnCount >= 3) {
    return 'grid gap-2 md:grid-cols-3';
  }
  if (columnCount === 2) {
    return 'grid gap-2 md:grid-cols-2';
  }
  return 'space-y-2';
};

export const fieldWidthClass = (width: SettingSheetBlock['layout']['width']) => {
  if (width === 'third') {
    return 'xl:col-span-2';
  }
  if (width === 'half') {
    return 'xl:col-span-3';
  }
  if (width === 'two-thirds') {
    return 'xl:col-span-4';
  }
  return 'xl:col-span-6';
};

export const appearanceClass = (
  appearance: SettingSheetBlock['appearance'],
  kind: 'section' | 'field' | 'group' | 'group-item',
) => {
  if (kind === 'section') {
    if (appearance === 'subtle') {
      return 'rounded-xl border bg-muted/50 px-6 py-6';
    }
    if (appearance === 'outline') {
      return 'rounded-xl border bg-card px-6 py-6';
    }
    return 'px-1 py-3';
  }

  if (kind === 'field') {
    if (appearance === 'subtle') {
      return 'rounded-xl border bg-muted/40 p-5';
    }
    if (appearance === 'plain') {
      return 'p-1';
    }
    return 'rounded-xl border bg-card p-5';
  }

  if (kind === 'group-item') {
    if (appearance === 'plain') {
      return 'border-t border-border bg-transparent';
    }
    if (appearance === 'outline') {
      return 'overflow-hidden rounded-xl border bg-card';
    }
    return 'overflow-hidden rounded-xl border bg-muted/40';
  }

  if (appearance === 'plain') {
    return 'space-y-4';
  }
  if (appearance === 'outline') {
    return 'rounded-xl border bg-card';
  }
  return 'rounded-xl border bg-muted/40';
};

export const formatGroupItemTitle = (value: string) => value.trim().length > 40 ? `${value.trim().slice(0, 40)}...` : value.trim();

export const moveItem = <T,>(items: T[], fromIndex: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[fromIndex], next[targetIndex]] = [next[targetIndex], next[fromIndex]];
  return next;
};