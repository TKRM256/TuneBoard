import { describe, expect, it } from 'vitest';

import { createElement } from './venue-element-factory';
import { allOfKind, colorOf, COLOR_KINDS, commonValue, FONT_KINDS, TEXT_KINDS } from './multi-edit';
import { DEFAULT_MARK_COLOR } from './venue-form-schema';

const text = createElement({ kind: 'text' }, 'p', { xMm: 0, yMm: 0 });
const field = { ...createElement({ kind: 'field', fieldId: 'f' }, 'p', { xMm: 0, yMm: 0 }), fontSizePt: 12 };
const icon = createElement({ kind: 'icon', iconName: 'check', nodes: [] }, 'p', { xMm: 0, yMm: 0 });

describe('multi edit', () => {
  it('どの要素にもある設定かを種類で決める', () => {
    expect(allOfKind([text, field], TEXT_KINDS)).toBe(true);
    expect(allOfKind([text, icon], FONT_KINDS)).toBe(false);
    expect(allOfKind([text, icon], COLOR_KINDS)).toBe(true);
    expect(allOfKind([], TEXT_KINDS)).toBe(false);
  });

  it('値が揃っていればその値、ばらばらなら undefined', () => {
    expect(commonValue([text, field], (e) => e.pageId)).toBe('p');
    expect(commonValue([text, field], (e) => ('fontSizePt' in e ? e.fontSizePt : 0))).toBeUndefined();
  });

  it('色を指定していないアイコンは印の色とみなす', () => {
    expect(colorOf({ ...icon, color: undefined } as never)).toBe(DEFAULT_MARK_COLOR);
  });
});
