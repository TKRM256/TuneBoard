/** 比較ツリーの型と、ツリーを畳む・絞り込むユーティリティ */
import type { MergeRow } from './merge-types';

export interface MergeFieldNode {
  kind: 'field';
  key: string;
  label: string;
  /** 差分がなければ null。その場合は共通の値をそのまま表示する。 */
  row: MergeRow | null;
  mine: string[];
  theirs: string[];
}

export interface MergeSectionNode {
  kind: 'section';
  key: string;
  label: string;
  children: MergeNode[];
}

export interface MergeGroupNode {
  kind: 'group';
  key: string;
  label: string;
  items: MergeGroupItemNode[];
}

export interface MergeGroupItemNode {
  key: string;
  label: string;
  /** 項目まるごとの差分（追加・削除・種類違い）。中身の比較に降りる場合は null。 */
  row: MergeRow | null;
  mineSummary: string | null;
  theirsSummary: string | null;
  children: MergeNode[];
}

export type MergeNode = MergeFieldNode | MergeSectionNode | MergeGroupNode;

/** ツリー上の差分行を、フォームの並び順のまま平坦な配列にする。 */
export function flattenMergeRows(nodes: MergeNode[]): MergeRow[] {
  const rows: MergeRow[] = [];

  for (const node of nodes) {
    if (node.kind === 'field') {
      if (node.row) {
        rows.push(node.row);
      }
      continue;
    }
    if (node.kind === 'section') {
      rows.push(...flattenMergeRows(node.children));
      continue;
    }
    for (const item of node.items) {
      if (item.row) {
        rows.push(item.row);
        continue;
      }
      rows.push(...flattenMergeRows(item.children));
    }
  }

  return rows;
}

/** 差分を含む枝だけを残す。マージ画面の「差分のある項目だけ表示」用。 */
export function pruneToDiffs(nodes: MergeNode[]): MergeNode[] {
  const pruned: MergeNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'field') {
      if (node.row) {
        pruned.push(node);
      }
      continue;
    }
    if (node.kind === 'section') {
      const children = pruneToDiffs(node.children);
      if (children.length > 0) {
        pruned.push({ ...node, children });
      }
      continue;
    }

    const items = node.items
      .map((item) => (item.row ? item : { ...item, children: pruneToDiffs(item.children) }))
      .filter((item) => item.row !== null || item.children.length > 0);
    if (items.length > 0) {
      pruned.push({ ...node, items });
    }
  }

  return pruned;
}
