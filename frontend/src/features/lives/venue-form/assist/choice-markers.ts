/** 選択肢の印（✓・○囲み・■・文字）を、選択肢ごとに順にクリックして置くための計算。座標はすべて mm。 */
import type { IconNode } from '@/features/stage-plot/stage-plot-types';

import type { FieldCatalog } from '../../canvas-shared/field-catalog';
import type { SnapBox } from '../../canvas-shared/snapping';
import type { SettingSheetBlock } from '../../types/live-types';
import { buildCondition, type ConditionSpec } from '../condition-builder';
import { createElement } from '../venue-element-factory';
import {
  DEFAULT_MARK_COLOR,
  type VenueElement,
  type VenueIconElement,
  type VenueShapeElement,
  type VenueTextElement,
} from '../venue-form-schema';
import { findCell, fontSizeForHeight, innerBox } from './cell-fit';
import type { PageLine } from './ruled-lines';

export type MarkerKind = 'check' | 'circle' | 'fill' | 'text';

export const MARKER_KIND_LABELS: Record<MarkerKind, string> = {
  check: '✓',
  circle: '○ 囲み',
  fill: '■ 塗り',
  text: '文字',
};

/** 印を置ける項目。グループの中の項目なら groupId がある。 */
export interface MarkerTarget {
  key: string;
  fieldId: string;
  groupId: string | null;
  label: string;
  type: string;
  options: string[];
}

export interface MarkerConfig {
  target: MarkerTarget;
  /** グループの中の項目で、何件目（1 始まり）で判定するか。null は「いずれかの件」 */
  itemIndex: number | null;
  kind: MarkerKind;
  /** kind が text のときに書く文字 */
  text: string;
}

export interface MarkerStep {
  label: string;
  condition: string;
}

const BOOLEAN_OPTIONS = ['はい', 'いいえ'];
const SELECT_TYPES = ['SINGLE_SELECT', 'MULTI_SELECT', 'CHECKBOX'];
/** クリックした枠がこれより小さければ、印を枠に合わせる（□の欄など）。 */
const SMALL_CELL_MM = 10;
const DEFAULT_SIZE: Record<MarkerKind, { w: number; h: number }> = {
  check: { w: 4, h: 4 },
  circle: { w: 10, h: 6 },
  fill: { w: 3, h: 3 },
  text: { w: 5, h: 5 },
};
const CHECK_NODES: IconNode[] = [['path', { d: 'M20 6 9 17l-5-5' }]];

function optionsOf(block: SettingSheetBlock | undefined): string[] {
  if (!block) return [];
  if (block.type === 'BOOLEAN') return BOOLEAN_OPTIONS;
  return SELECT_TYPES.includes(block.type) ? block.options : [];
}

/** 選択肢の決まっている項目（選択・チェック・はい/いいえ）。選択肢を他の回答から作る項目は除く。 */
export function markerTargets(catalog: FieldCatalog, blocksById: Map<string, SettingSheetBlock>): MarkerTarget[] {
  const entries = [
    ...catalog.fields.map((field) => ({ field, groupId: null as string | null, label: field.pathLabel })),
    ...catalog.groups.flatMap((group) => group.fields.map((field) => ({ field, groupId: group.id, label: field.pathLabel }))),
  ];
  return entries
    .map(({ field, groupId, label }) => {
      const block = blocksById.get(field.id);
      return { key: `${groupId ?? ''}|${field.id}`, fieldId: field.id, groupId, label, type: block?.type ?? '', options: optionsOf(block) };
    })
    .filter((target) => target.options.length > 0);
}

/** 選択肢ごとの「その選択肢が選ばれていたら出す」条件。 */
export function markerSteps(config: MarkerConfig): MarkerStep[] {
  const { target, itemIndex } = config;
  const base = { fieldId: target.fieldId, groupId: target.groupId, itemIndex: target.groupId ? itemIndex : null };
  return target.options.map((option, index) => {
    const spec: ConditionSpec = target.type === 'BOOLEAN'
      ? { ...base, operator: index === 0 ? 'isTrue' : 'isFalse' }
      : { ...base, operator: 'includes', value: option };
    return { label: option, condition: buildCondition(spec) };
  });
}

/** クリックした点に置く印の箱。小さい枠の中なら枠に合わせ、そうでなければ決まった大きさで点を中心に置く。 */
export function markerBoxAt(kind: MarkerKind, x: number, y: number, lines: PageLine[]): SnapBox {
  const cell = kind === 'circle' ? null : findCell(x, y, lines);
  if (cell && cell.right - cell.left <= SMALL_CELL_MM && cell.bottom - cell.top <= SMALL_CELL_MM) {
    return innerBox(cell);
  }
  const size = DEFAULT_SIZE[kind];
  return { xMm: round2(x - size.w / 2), yMm: round2(y - size.h / 2), wMm: size.w, hMm: size.h };
}

export function createMarker(config: MarkerConfig, box: SnapBox, pageId: string, condition: string): VenueElement {
  const at = { xMm: box.xMm, yMm: box.yMm };
  const placed = { ...box, condition };
  switch (config.kind) {
    case 'check':
      return { ...(createElement({ kind: 'icon', iconName: 'check', nodes: CHECK_NODES }, pageId, at) as VenueIconElement), ...placed };
    case 'circle':
      return { ...(createElement({ kind: 'shape', shape: 'ellipse' }, pageId, at) as VenueShapeElement), ...placed };
    case 'fill':
      return { ...(createElement({ kind: 'shape', shape: 'rect' }, pageId, at) as VenueShapeElement), ...placed, fillColor: DEFAULT_MARK_COLOR };
    case 'text':
      return {
        ...(createElement({ kind: 'text', content: config.text || '○' }, pageId, at) as VenueTextElement),
        ...placed,
        align: 'center',
        fontSizePt: fontSizeForHeight(box.hMm),
        color: DEFAULT_MARK_COLOR,
      };
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
