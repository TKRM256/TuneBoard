/** Build a sensible starting canvas from the form configuration. Mirrors the
 *  backend `DefaultCanvasFactory` logic so the editor always starts with the
 *  same layout the server would produce. */
import type { SettingSheetConfigResponse } from '../types/live-types';
import type {
  CanvasDocument,
  CanvasElement,
  Orientation,
  PaperSize,
  TableColumn,
  TableElement,
} from './canvas-schema';
import { buildFieldCatalog } from './field-catalog';

export function newId(): string {
  return crypto.randomUUID();
}

const DEFAULT_PAGE = { size: 'A4' as PaperSize, orientation: 'LANDSCAPE' as Orientation, marginMm: 8, baseFontSizePt: 9 };

export function buildDefaultCanvas(config: SettingSheetConfigResponse | null): CanvasDocument {
  const elements: CanvasElement[] = [];
  const pageWidthMm = 297; // A4 landscape
  let y = 8;

  elements.push({
    id: newId(),
    kind: 'text',
    xMm: 8,
    yMm: y,
    wMm: pageWidthMm - 16,
    hMm: 12,
    content: '${live.name}',
    fontSizePt: 18,
    bold: true,
    align: 'left',
    verticalAlign: 'middle',
    color: '#1f2937',
  });
  y += 14;

  elements.push({
    id: newId(),
    kind: 'text',
    xMm: 8,
    yMm: y,
    wMm: pageWidthMm - 16,
    hMm: 6,
    content: "${formatDate(live.date, 'yyyy/M/d')}  /  ${live.location}  /  ${live.tenantName}",
    fontSizePt: 9,
    align: 'left',
    verticalAlign: 'middle',
    color: '#6b7280',
  });
  y += 8;

  elements.push({
    id: newId(),
    kind: 'text',
    xMm: 8,
    yMm: y,
    wMm: pageWidthMm - 16,
    hMm: 5,
    content: "提出日時: ${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}",
    fontSizePt: 9,
    align: 'left',
    verticalAlign: 'middle',
    color: '#374151',
  });
  y += 7;

  elements.push({
    id: newId(),
    kind: 'divider',
    xMm: 8,
    yMm: y,
    wMm: pageWidthMm - 16,
    hMm: 1,
    color: '#d1d5db',
    thicknessPt: 0.6,
  });
  y += 4;

  const catalog = buildFieldCatalog(config);

  if (catalog.fields.length > 0) {
    const tableW = (pageWidthMm - 16) * 0.5 - 2;
    const columns: TableColumn[] = [
      { id: newId(), header: '項目', fieldId: '__label__', widthRatio: 0.3, align: 'left' },
      { id: newId(), header: '内容', fieldId: '', widthRatio: 0.7, align: 'left' },
    ];
    const tableEl: TableElement = {
      id: newId(),
      kind: 'table',
      xMm: 8,
      yMm: y,
      wMm: tableW,
      hMm: Math.max(20, catalog.fields.length * 7),
      source: {
        kind: 'fields',
        fields: catalog.fields.map((f) => ({ fieldId: f.id, fallbackLabel: f.label })),
      },
      columns,
      showHeader: true,
      fontSizePt: 9,
      headerFill: '#e5edf6',
      borderColor: '#d1d5db',
      zebra: false,
    };
    elements.push(tableEl);
  }

  let groupX = catalog.fields.length > 0 ? 8 + (pageWidthMm - 16) * 0.5 + 2 : 8;
  let groupW = catalog.fields.length > 0 ? (pageWidthMm - 16) * 0.5 - 2 : pageWidthMm - 16;
  let groupY = y;
  for (const group of catalog.groups) {
    if (group.fields.length === 0) continue;
    const columns: TableColumn[] = [
      { id: newId(), header: 'No', fieldId: '__index__', widthRatio: 0.08, align: 'center' },
    ];
    const each = 0.92 / group.fields.length;
    for (const f of group.fields) {
      columns.push({ id: newId(), header: f.label, fieldId: f.id, widthRatio: each, align: 'left' });
    }
    elements.push({
      id: newId(),
      kind: 'table',
      xMm: groupX,
      yMm: groupY,
      wMm: groupW,
      hMm: Math.max(40, group.fields.length * 6 + 16),
      source: { kind: 'group', groupId: group.id, fallbackLabel: group.label },
      columns,
      showHeader: true,
      fontSizePt: 9,
      headerFill: '#e5edf6',
      borderColor: '#d1d5db',
      zebra: false,
    });
    groupY += 50;
    groupX = 8;
    groupW = pageWidthMm - 16;
  }

  return {
    page: { ...DEFAULT_PAGE },
    elements,
  };
}
