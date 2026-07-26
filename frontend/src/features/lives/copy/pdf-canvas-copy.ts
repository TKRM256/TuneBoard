/**
 * 他ライブの PDF レイアウトを、いま編集中のレイアウトへ取り込むための計画を組み立てる。
 * 要素が参照している項目が現在のフォームに存在するかを見て、
 * そのまま使えるか（値が空になるか）を事前に示す。
 */
import { elementKindLabel, type CanvasDocument, type CanvasElement, type TableElement } from '../pdf/canvas-schema';
import { newId } from '../pdf/default-canvas';
import type { FieldCatalog } from '../pdf/field-catalog';

/** 表の列で使う擬似フィールド。フォームの項目ではないので参照チェックの対象外。 */
const PSEUDO_FIELD_IDS = new Set(['__index__', '__label__', '']);

/** 式の中で明示的に項目を参照している箇所だけを拾う。 */
const REFERENCE_IN_EXPRESSION = /(?:fields|groups)\['([^']+)'\]|\.(?:field|group)\('([^']+)'\)/g;

export type PdfCanvasCopyMode = 'replace' | 'append';

export interface CanvasElementCopyEntry {
  id: string;
  kindLabel: string;
  summary: string;
  /** 現在のフォームに見つからない参照項目のラベル。 */
  missingRefs: string[];
}

export interface PdfCanvasCopyPlan {
  elements: CanvasElementCopyEntry[];
  pageSummary: string;
  pageChanged: boolean;
}

export function buildPdfCanvasCopyPlan(
  current: CanvasDocument,
  source: CanvasDocument,
  currentCatalog: FieldCatalog,
  sourceCatalog: FieldCatalog,
): PdfCanvasCopyPlan {
  const elements = source.elements.map<CanvasElementCopyEntry>((element) => ({
    id: element.id,
    kindLabel: elementKindLabel(element.kind),
    summary: summarizeElement(element, sourceCatalog),
    missingRefs: collectReferencedIds(element)
      .filter((id) => !currentCatalog.labelById.has(id))
      .map((id) => sourceCatalog.labelById.get(id)?.label ?? id),
  }));

  return {
    elements,
    pageSummary: `${source.page.size} / ${source.page.orientation === 'LANDSCAPE' ? '横' : '縦'} / 余白 ${source.page.marginMm}mm`,
    pageChanged:
      current.page.size !== source.page.size
      || current.page.orientation !== source.page.orientation
      || current.page.marginMm !== source.page.marginMm
      || current.page.baseFontSizePt !== source.page.baseFontSizePt,
  };
}

export function applyPdfCanvasCopy(
  current: CanvasDocument,
  source: CanvasDocument,
  selectedIds: Set<string>,
  mode: PdfCanvasCopyMode,
  includePage: boolean,
): CanvasDocument {
  const picked = source.elements.filter((element) => selectedIds.has(element.id));
  const page = includePage ? { ...source.page } : { ...current.page };

  if (mode === 'replace') {
    return { page, elements: picked.map((element) => cloneElement(element, false)) };
  }

  return { page, elements: [...current.elements, ...picked.map((element) => cloneElement(element, true))] };
}

function cloneElement(element: CanvasElement, regenerateIds: boolean): CanvasElement {
  const clone = JSON.parse(JSON.stringify(element)) as CanvasElement;
  if (!regenerateIds) {
    return clone;
  }
  clone.id = newId();
  if (clone.kind === 'table') {
    (clone as TableElement).columns = (clone as TableElement).columns.map((column) => ({ ...column, id: newId() }));
  }
  return clone;
}

function summarizeElement(element: CanvasElement, catalog: FieldCatalog): string {
  switch (element.kind) {
    case 'text':
      return truncate(element.content) || '(空のテキスト)';
    case 'field':
      return catalog.labelById.get(element.fieldId)?.label ?? element.fallbackLabel ?? element.fieldId;
    case 'table': {
      const origin = element.source.kind === 'group'
        ? catalog.labelById.get(element.source.groupId)?.label ?? element.source.fallbackLabel ?? element.source.groupId
        : '選んだ項目';
      return `${origin} / ${element.columns.length}列`;
    }
    case 'divider':
      return `幅 ${Math.round(element.wMm)}mm`;
    case 'spacer':
      return `${Math.round(element.wMm)} x ${Math.round(element.hMm)}mm`;
  }
}

function collectReferencedIds(element: CanvasElement): string[] {
  const ids = new Set<string>();

  switch (element.kind) {
    case 'text':
      collectExpressionIds(element.content, ids);
      break;
    case 'field':
      ids.add(element.fieldId);
      break;
    case 'table': {
      if (element.source.kind === 'group') {
        ids.add(element.source.groupId);
      } else {
        for (const field of element.source.fields) {
          ids.add(field.fieldId);
        }
      }
      for (const column of element.columns) {
        if (!PSEUDO_FIELD_IDS.has(column.fieldId)) {
          ids.add(column.fieldId);
        }
        collectExpressionIds(column.format ?? '', ids);
      }
      break;
    }
    default:
      break;
  }

  ids.delete('');
  return Array.from(ids);
}

function collectExpressionIds(expression: string, into: Set<string>) {
  for (const match of expression.matchAll(REFERENCE_IN_EXPRESSION)) {
    const id = match[1] ?? match[2];
    if (id) {
      into.add(id);
    }
  }
}

function truncate(value: string, length = 60) {
  const single = value.replace(/\s+/g, ' ').trim();
  return single.length > length ? `${single.slice(0, length)}...` : single;
}
