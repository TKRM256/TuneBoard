/** Visual representation of a single canvas element inside the editor.
 *  Mirrors (loosely) how the backend will render the same element in the PDF. */
import type { CSSProperties } from 'react';
import type { CanvasElement, TableElement } from '../canvas-schema';
import type { FieldCatalog } from '../field-catalog';

interface Props {
  element: CanvasElement;
  catalog: FieldCatalog;
  selected: boolean;
}

export function CanvasElementView({ element, catalog, selected }: Props) {
  switch (element.kind) {
    case 'text':
      return (
        <div style={textBoxStyle(element, selected)}>
          {element.content || <span style={placeholderStyle}>(テキスト)</span>}
        </div>
      );
    case 'field': {
      const labelInfo = catalog.labelById.get(element.fieldId);
      const label = element.labelOverride || labelInfo?.label || element.fallbackLabel || '(未設定)';
      const valuePreview = `〔${label}〕`;
      const display = element.showLabel ? `${label}: ${valuePreview}` : valuePreview;
      return <div style={textBoxStyle(element, selected)}>{display}</div>;
    }
    case 'divider': {
      const thickness = (element.thicknessPt ?? 0.6) * 1.2; // approx px
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              height: thickness,
              backgroundColor: element.color || '#d1d5db',
              outline: selected ? '1.5px dashed #2563eb' : 'none',
              outlineOffset: 2,
            }}
          />
        </div>
      );
    }
    case 'spacer':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '1px dashed ' + (selected ? '#2563eb' : '#cbd5e1'),
            background: 'rgba(148,163,184,0.05)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          スペーサー
        </div>
      );
    case 'table':
      return <TablePreview element={element} catalog={catalog} selected={selected} />;
  }
}

function TablePreview({ element, catalog, selected }: { element: TableElement; catalog: FieldCatalog; selected: boolean }) {
  const showHeader = element.showHeader !== false;
  const fontSize = Math.max(8, element.fontSizePt * 1.0);
  const sourceLabel = element.source.kind === 'group'
    ? (catalog.labelById.get(element.source.groupId)?.label ?? element.source.fallbackLabel ?? '(グループ)')
    : '(KV テーブル)';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid ' + (element.borderColor || '#d1d5db'),
        outline: selected ? '1.5px dashed #2563eb' : 'none',
        outlineOffset: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        overflow: 'hidden',
        fontSize,
      }}
    >
      {showHeader && (
        <div style={{ display: 'flex', background: element.headerFill || '#e5edf6', borderBottom: '1px solid ' + (element.borderColor || '#d1d5db') }}>
          {element.columns.map((c) => (
            <div
              key={c.id}
              style={{
                flex: c.widthRatio,
                padding: '2px 4px',
                fontWeight: 600,
                borderRight: '1px solid ' + (element.borderColor || '#e5e7eb'),
                textAlign: c.align ?? 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c.header}
            </div>
          ))}
        </div>
      )}
      <div style={{ flex: 1, padding: '4px 6px', color: '#64748b', fontSize: 10, lineHeight: 1.3 }}>
        <div>{sourceLabel}</div>
        <div style={{ marginTop: 2 }}>列: {element.columns.map((c) => c.header || '?').join(' / ')}</div>
        <div style={{ marginTop: 2 }}>
          {element.autoGrow !== false
            ? '※ この枠は最低の高さです。行が増えると下へ伸びます'
            : '※ 実際の行はコンパイル後にレンダリングされます'}
        </div>
      </div>
    </div>
  );
}

function textBoxStyle(element: { content?: string; fontSizePt: number; bold?: boolean; italic?: boolean; align?: string; verticalAlign?: string; color?: string; backgroundColor?: string; borderColor?: string; borderThicknessPt?: number }, selected: boolean): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    fontSize: element.fontSizePt * 1.0,
    fontWeight: element.bold ? 700 : 400,
    fontStyle: element.italic ? 'italic' : undefined,
    color: element.color || '#111827',
    background: element.backgroundColor || 'transparent',
    border: element.borderColor ? `${element.borderThicknessPt ?? 0.5}px solid ${element.borderColor}` : 'none',
    outline: selected ? '1.5px dashed #2563eb' : 'none',
    outlineOffset: 1,
    textAlign: (element.align as 'left' | 'center' | 'right') || 'left',
    display: 'flex',
    alignItems: element.verticalAlign === 'middle' || element.verticalAlign === 'center' ? 'center'
      : element.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
    justifyContent: element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start',
    padding: '1px 3px',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.3,
    boxSizing: 'border-box',
  };
}

const placeholderStyle: CSSProperties = { color: '#9ca3af', fontStyle: 'italic' };
