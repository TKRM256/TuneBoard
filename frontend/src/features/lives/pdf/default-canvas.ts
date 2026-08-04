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
import { buildStandardGroupColumns, indexColumn } from './default-canvas-columns';
import { buildFieldCatalog, type CatalogGroup } from './field-catalog';

export function newId(): string {
  return crypto.randomUUID();
}

const DEFAULT_PAGE = { size: 'A4' as PaperSize, orientation: 'LANDSCAPE' as Orientation, marginMm: 8, baseFontSizePt: 9 };

const PAGE_HEIGHT_MM = 210; // A4 landscape
/** 上段（単発項目のKV表・最初の繰り返しグループ）の高さ。 */
const TOP_ROW_HEIGHT_MM = 46;

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
    hMm: 4,
    color: '#d1d5db',
    thicknessPt: 0.6,
  });
  y += 6;

  const catalog = buildFieldCatalog(config);
  const contentW = pageWidthMm - 16;
  const halfW = contentW * 0.5 - 2;
  const hasFields = catalog.fields.length > 0;
  const [firstGroup, ...restGroups] = catalog.groups.filter((group) => group.fields.length > 0);

  // 上段は「単発項目のKV表」と「最初の繰り返しグループ」を左右に並べ、
  // 残りのグループ（セットリストなど）は下段に幅いっぱいで積む。
  if (hasFields) {
    elements.push({
      id: newId(),
      kind: 'table',
      xMm: 8,
      yMm: y,
      wMm: firstGroup ? halfW : contentW,
      hMm: TOP_ROW_HEIGHT_MM,
      source: {
        kind: 'fields',
        fields: catalog.fields.map((f) => ({ fieldId: f.id, fallbackLabel: f.label })),
      },
      columns: [
        { id: newId(), header: '項目', fieldId: '__label__', widthRatio: 0.3, align: 'left' },
        { id: newId(), header: '内容', fieldId: '', widthRatio: 0.7, align: 'left' },
      ],
      showHeader: true,
      fontSizePt: 9,
      headerFill: '#e5edf6',
      borderColor: '#d1d5db',
      zebra: false,
      autoGrow: true,
    });
  }

  if (firstGroup) {
    elements.push(groupTable(
      firstGroup,
      hasFields ? 8 + contentW * 0.5 + 2 : 8,
      y,
      hasFields ? halfW : contentW,
      TOP_ROW_HEIGHT_MM,
    ));
  }

  const bottomTop = y + TOP_ROW_HEIGHT_MM + 4;
  const bottomHeight = PAGE_HEIGHT_MM - 8 - bottomTop;
  restGroups.forEach((group, index) => {
    const each = bottomHeight / restGroups.length;
    elements.push(groupTable(group, 8, bottomTop + each * index, contentW, each - 4));
  });

  return {
    page: { ...DEFAULT_PAGE },
    elements,
  };
}

function groupTable(group: CatalogGroup, xMm: number, yMm: number, wMm: number, hMm: number): TableElement {
  return {
    id: newId(),
    kind: 'table',
    xMm,
    yMm,
    wMm,
    hMm,
    source: { kind: 'group', groupId: group.id, fallbackLabel: group.label },
    columns: buildStandardGroupColumns(group) ?? genericGroupColumns(group),
    showHeader: true,
    fontSizePt: 9,
    headerFill: '#e5edf6',
    borderColor: '#d1d5db',
    zebra: false,
    autoGrow: true,
  };
}

function genericGroupColumns(group: CatalogGroup): TableColumn[] {
  const each = 0.92 / group.fields.length;
  return [
    indexColumn(0.08),
    ...group.fields.map((f) => ({
      id: newId(),
      header: f.label,
      fieldId: f.id,
      widthRatio: each,
      align: 'left' as const,
    })),
  ];
}
