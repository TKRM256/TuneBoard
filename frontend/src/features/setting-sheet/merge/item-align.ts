/** 繰り返しグループ項目を base / 自分 / 相手 の 3 者で整列する */
import type { SettingSheetGroupItemValue } from '../helpers/form-state';
import { lcsMatches } from './lcs';
import { fieldValueSignature } from './merge-types';

export interface AlignedItemSlot {
  baseIndex: number | null;
  mineIndex: number | null;
  theirsIndex: number | null;
}

export function groupItemSignature(item: SettingSheetGroupItemValue): string {
  return JSON.stringify([
    item.variantId,
    Object.keys(item.answers)
      .sort()
      .map((key) => [key, fieldValueSignature(item.answers[key])] as const),
  ]);
}

interface SidePairing {
  /** base の位置 → 相手側の位置。内容が同一のものと、位置的に対応する変更済みのものを含む。 */
  byBase: Map<number, number>;
  /** base に対応が無い（＝追加された）側の位置。base のどの位置の直前に入るかを添える。 */
  additions: Array<{ beforeBase: number; sideIndex: number }>;
}

/**
 * base と片側を突き合わせる。
 * まず内容が完全一致するものを LCS でアンカーとして固定し、
 * 残った隙間どうしを順番に 1 対 1 で対応付けて「変更された項目」とみなす。
 */
function pairAgainstBase(baseSignatures: string[], sideSignatures: string[]): SidePairing {
  const anchors = lcsMatches(baseSignatures, sideSignatures);
  const byBase = new Map<number, number>();
  const additions: Array<{ beforeBase: number; sideIndex: number }> = [];

  let baseCursor = 0;
  let sideCursor = 0;

  const pairGap = (baseEnd: number, sideEnd: number) => {
    const baseGap: number[] = [];
    for (let i = baseCursor; i < baseEnd; i += 1) {
      baseGap.push(i);
    }
    const sideGap: number[] = [];
    for (let j = sideCursor; j < sideEnd; j += 1) {
      sideGap.push(j);
    }

    const paired = Math.min(baseGap.length, sideGap.length);
    for (let k = 0; k < paired; k += 1) {
      byBase.set(baseGap[k], sideGap[k]);
    }
    for (let k = paired; k < sideGap.length; k += 1) {
      additions.push({ beforeBase: baseEnd, sideIndex: sideGap[k] });
    }
  };

  for (const [baseIndex, sideIndex] of anchors) {
    pairGap(baseIndex, sideIndex);
    byBase.set(baseIndex, sideIndex);
    baseCursor = baseIndex + 1;
    sideCursor = sideIndex + 1;
  }
  pairGap(baseSignatures.length, sideSignatures.length);

  return { byBase, additions };
}

/**
 * base 順にスロットを並べる。base に無い項目（追加）は挿入位置のアンカー直前に置き、
 * 双方が同じ内容を追加した場合はひとつのスロットにまとめて差分にしない。
 */
export function alignGroupItems(
  base: SettingSheetGroupItemValue[],
  mine: SettingSheetGroupItemValue[],
  theirs: SettingSheetGroupItemValue[],
): AlignedItemSlot[] {
  const baseSignatures = base.map(groupItemSignature);
  const mineSignatures = mine.map(groupItemSignature);
  const theirsSignatures = theirs.map(groupItemSignature);

  const minePairing = pairAgainstBase(baseSignatures, mineSignatures);
  const theirsPairing = pairAgainstBase(baseSignatures, theirsSignatures);

  const slots: AlignedItemSlot[] = [];

  const pushAdditions = (beforeBase: number) => {
    const mineAdded = minePairing.additions.filter((entry) => entry.beforeBase === beforeBase);
    const theirsAdded = theirsPairing.additions.filter((entry) => entry.beforeBase === beforeBase);
    const remainingTheirs = [...theirsAdded];

    for (const added of mineAdded) {
      const twinIndex = remainingTheirs.findIndex(
        (entry) => theirsSignatures[entry.sideIndex] === mineSignatures[added.sideIndex],
      );
      if (twinIndex >= 0) {
        slots.push({
          baseIndex: null,
          mineIndex: added.sideIndex,
          theirsIndex: remainingTheirs[twinIndex].sideIndex,
        });
        remainingTheirs.splice(twinIndex, 1);
        continue;
      }
      slots.push({ baseIndex: null, mineIndex: added.sideIndex, theirsIndex: null });
    }

    for (const added of remainingTheirs) {
      slots.push({ baseIndex: null, mineIndex: null, theirsIndex: added.sideIndex });
    }
  };

  for (let baseIndex = 0; baseIndex < base.length; baseIndex += 1) {
    pushAdditions(baseIndex);
    slots.push({
      baseIndex,
      mineIndex: minePairing.byBase.get(baseIndex) ?? null,
      theirsIndex: theirsPairing.byBase.get(baseIndex) ?? null,
    });
  }
  pushAdditions(base.length);

  return slots;
}
