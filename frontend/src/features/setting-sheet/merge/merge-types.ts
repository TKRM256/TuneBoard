/** 提出済みシートの 3-way マージ（base / 自分 / 相手）で使う共通型 */
import type { SettingSheetFieldValue } from '../helpers/form-state';

export type MergeSide = 'mine' | 'theirs';

/** 差分行の種類 */
export type MergeRowKind =
  /** 単一フィールドの値が食い違っている */
  | 'value'
  /** 繰り返しグループの項目が片側だけに存在する（追加） */
  | 'item-added'
  /** 繰り返しグループの項目が片側で削除されている */
  | 'item-removed';

/** 行ごとの採用内容。side はその側の状態をまるごと採用、text は文字単位マージの結果。 */
export type MergeChoice =
  | { kind: 'side'; side: MergeSide }
  | { kind: 'text'; value: string };

export interface MergeRow {
  /** 差分の位置を一意に表すキー。収集と適用で同じ規則を使う。 */
  key: string;
  /** 「曲2 › チューニング」のような表示ラベル */
  label: string;
  kind: MergeRowKind;
  /** 'both' がコンフリクト（ユーザーが必ず選ぶ） */
  changedBy: MergeSide | 'both';
  base: string[] | null;
  mine: string[] | null;
  theirs: string[] | null;
  /** item-added / item-removed のときにどの項目かを示す要約 */
  itemSummary?: { mine?: string; theirs?: string };
  /** どちらでもない内容を直接入力して決着させられるか（自由記述の項目のみ） */
  editable: boolean;
  /** 直接入力欄を複数行にするか */
  multiline: boolean;
}

export type MergeSelections = Record<string, MergeChoice>;

/** 双方が変更した行は既定選択を持たせず、ユーザーに必ず選ばせる。 */
export function defaultChoiceFor(row: MergeRow): MergeChoice | null {
  if (row.changedBy === 'both') {
    return null;
  }
  return { kind: 'side', side: row.changedBy };
}

export function buildDefaultSelections(rows: MergeRow[]): MergeSelections {
  const selections: MergeSelections = {};
  for (const row of rows) {
    const choice = defaultChoiceFor(row);
    if (choice) {
      selections[row.key] = choice;
    }
  }
  return selections;
}

export function countUnresolved(rows: MergeRow[], selections: MergeSelections) {
  return rows.filter((row) => row.changedBy === 'both' && !selections[row.key]).length;
}

/** 差分位置のキー。フィールドは `<親>/<blockId>`、グループ項目は `<親>/<blockId>#<スロット番号>`。 */
export function joinKey(parentKey: string, segment: string) {
  return parentKey ? `${parentKey}/${segment}` : segment;
}

export function itemSlotKey(parentKey: string, blockId: string, slotIndex: number) {
  return joinKey(parentKey, `${blockId}#${slotIndex}`);
}

export function isSameValues(a: string[] | undefined, b: string[] | undefined) {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** グループ項目の内容シグネチャ。整列と「変更されたか」の判定に使う。 */
export function fieldValueSignature(value: SettingSheetFieldValue | undefined): string {
  if (!value) {
    return '';
  }
  const items = value.items.map((item) => ({
    variantId: item.variantId,
    answers: Object.keys(item.answers)
      .sort()
      .map((key) => [key, fieldValueSignature(item.answers[key])] as const),
  }));
  return JSON.stringify([value.values, items]);
}
