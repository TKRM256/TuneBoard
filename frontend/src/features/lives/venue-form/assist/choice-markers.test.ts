import { describe, expect, it } from 'vitest';

import { createMarker, markerBoxAt, markerSteps, type MarkerConfig, type MarkerTarget } from './choice-markers';
import type { PageLine } from './ruled-lines';

const parts: MarkerTarget = { key: 'setlist|parts', fieldId: 'parts', groupId: 'setlist', label: '使うパート', type: 'MULTI_SELECT', options: ['Vocal', 'Bass'] };
const pa: MarkerTarget = { key: '|pa', fieldId: 'pa', groupId: null, label: 'PA乗込み', type: 'BOOLEAN', options: ['はい', 'いいえ'] };

function config(target: MarkerTarget, patch: Partial<MarkerConfig> = {}): MarkerConfig {
  return { target, itemIndex: null, kind: 'check', text: '', ...patch };
}

describe('markerSteps', () => {
  it('選択肢ごとに、いずれかの件で選ばれていたら出す条件を作る', () => {
    const steps = markerSteps(config(parts));
    expect(steps.map((s) => s.label)).toEqual(['Vocal', 'Bass']);
    expect(steps[1].condition).toBe("${count(filter(groups['setlist'].items, (m) -> contains(m.field('parts').values, 'Bass'))) > 0}");
  });

  it('何件目かを指定できる', () => {
    expect(markerSteps(config(parts, { itemIndex: 2 }))[0].condition)
      .toBe("${count(groups['setlist'].items) >= 2 && contains(groups['setlist'].items[1].field('parts').values, 'Vocal')}");
  });

  it('はい/いいえは、オンとオフで条件を分ける', () => {
    expect(markerSteps(config(pa)).map((s) => s.condition)).toEqual([
      "${fields['pa'].value == 'true'}",
      "${fields['pa'].value == 'false'}",
    ]);
  });
});

describe('markerBoxAt', () => {
  const lines: PageLine[] = [
    { axis: 'h', posMm: 10, fromMm: 0, toMm: 100 }, { axis: 'h', posMm: 16, fromMm: 0, toMm: 100 },
    { axis: 'v', posMm: 40, fromMm: 10, toMm: 16 }, { axis: 'v', posMm: 46, fromMm: 10, toMm: 16 },
  ];

  it('小さい枠の中なら枠に合わせる（枠いっぱいと同じ余白）', () => {
    expect(markerBoxAt('check', 43, 13, lines)).toEqual({ xMm: 40.5, yMm: 10.5, wMm: 5, hMm: 5 });
  });

  it('大きい枠や枠の外では、決まった大きさでクリックした点を中心に置く', () => {
    expect(markerBoxAt('check', 20, 13, lines)).toEqual({ xMm: 18, yMm: 11, wMm: 4, hMm: 4 });
  });

  it('○囲みは枠に合わせない', () => {
    expect(markerBoxAt('circle', 43, 13, lines)).toEqual({ xMm: 38, yMm: 10, wMm: 10, hMm: 6 });
  });
});

describe('createMarker', () => {
  const box = { xMm: 1, yMm: 2, wMm: 4, hMm: 4 };

  it('種類に応じた要素を作り、条件を付ける', () => {
    expect(createMarker(config(pa), box, 'p1', 'C')).toMatchObject({ kind: 'icon', iconName: 'check', ...box, condition: 'C', pageId: 'p1' });
    expect(createMarker(config(pa, { kind: 'circle' }), box, 'p1', 'C')).toMatchObject({ kind: 'shape', shape: 'ellipse' });
    expect(createMarker(config(pa, { kind: 'fill' }), box, 'p1', 'C')).toMatchObject({ kind: 'shape', shape: 'rect', fillColor: '#dc2626' });
    expect(createMarker(config(pa, { kind: 'text', text: 'レ' }), box, 'p1', 'C')).toMatchObject({ kind: 'text', content: 'レ', align: 'center' });
  });
});
