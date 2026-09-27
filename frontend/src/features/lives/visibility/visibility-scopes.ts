/** 表示先（共有フォーム / 管理者画面 / 公開フォーム）の定義。 */
import type { SettingSheetBlock } from '../types/live-types';

export type VisibilityScopeKey = 'shared' | 'admin' | 'form';

/** ブロック側でこの表示先を表す項目。hidden だけ「true = 非表示」なので反転して扱う。 */
export type VisibilityField = 'publicVisible' | 'adminVisible' | 'hidden';

export interface VisibilityScope {
  key: VisibilityScopeKey;
  /** 列見出しに出す短い名前 */
  label: string;
  /** どこに出るのかの説明 */
  description: string;
  field: VisibilityField;
  inverted: boolean;
  /** 表示ONのときの配色 */
  onClassName: string;
}

export const VISIBILITY_SCOPES: VisibilityScope[] = [
  {
    key: 'shared',
    label: '共有用提出一覧',
    description: '',
    field: 'publicVisible',
    inverted: false,
    onClassName:
      'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60',
  },
  {
    key: 'admin',
    label: '管理者用提出一覧',
    description: '',
    field: 'adminVisible',
    inverted: false,
    onClassName:
      'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60',
  },
  {
    key: 'form',
    label: 'フォーム',
    description: '',
    field: 'hidden',
    inverted: true,
    onClassName:
      'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60',
  },
];

/** 表示OFFのときの配色（表示先によらず共通）。 */
export const VISIBILITY_OFF_CLASS_NAME =
  'border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted/60';

function readField(block: SettingSheetBlock, field: VisibilityField): boolean {
  if (field === 'adminVisible') {
    // adminVisible が無い旧データは共有設定を引き継ぐ
    return block.adminVisible === undefined ? block.publicVisible === true : block.adminVisible === true;
  }
  return block[field] === true;
}

/** そのブロックがこの表示先で見えているか。 */
export function isVisibleIn(block: SettingSheetBlock, scope: VisibilityScope): boolean {
  const raw = readField(block, scope.field);
  return scope.inverted ? !raw : raw;
}

/** 「見せたい/隠したい」を、ブロックに保存する値へ変換する。 */
export function toFieldValue(scope: VisibilityScope, visible: boolean): boolean {
  return scope.inverted ? !visible : visible;
}
