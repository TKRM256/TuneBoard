import { describe, expect, it } from 'vitest';

import { createBlockTemplate, type SettingSheetConfigResponse } from '@/features/lives/types/live-types';

import { hideUnavailableStagePlots } from './stage-plot-availability';
import { parseStagePlotValue, serializeStagePlotValue, summarizeStagePlot, type PublicStagePlot } from './stage-plot-types';

function configWithPlot(): SettingSheetConfigResponse {
  const group = createBlockTemplate('REPEATABLE_GROUP');
  group.fields = [createBlockTemplate('STAGE_PLOT')];
  return {
    title: '',
    description: '',
    submitButtonLabel: '送信',
    publicSubmissionEnabled: true,
    blocks: [createBlockTemplate('STAGE_PLOT'), createBlockTemplate('SHORT_TEXT'), group],
  };
}

const palette: PublicStagePlot = {
  hasBase: false,
  aspectRatio: 1.6,
  iconScale: 0.08,
  palette: [{ id: 'gt', iconName: 'guitar', label: 'Gt', color: '#000', nodes: [] }],
};

describe('stage plot values', () => {
  it('round-trips items and treats an empty plot as unanswered', () => {
    const raw = serializeStagePlotValue({ items: [{ id: '1', paletteId: 'gt', label: 'Gt 田中', x: 0.2, y: 0.3 }] });
    expect(parseStagePlotValue(raw).items[0]).toMatchObject({ paletteId: 'gt', label: 'Gt 田中', x: 0.2 });
    expect(serializeStagePlotValue({ items: [] })).toBe('');
  });

  it('ignores broken values and clamps positions', () => {
    expect(parseStagePlotValue('{broken').items).toEqual([]);
    const clamped = parseStagePlotValue('{"items":[{"id":"1","paletteId":"gt","label":"","x":2,"y":-1}]}');
    expect(clamped.items[0]).toMatchObject({ x: 1, y: 0 });
  });

  it('summarizes the placed labels', () => {
    const raw = serializeStagePlotValue({
      items: [
        { id: '1', paletteId: 'gt', label: 'Gt', x: 0, y: 0 },
        { id: '2', paletteId: 'gt', label: 'Vo', x: 0, y: 0 },
      ],
    });
    expect(summarizeStagePlot(raw)).toBe('配置図: Gt / Vo');
    expect(summarizeStagePlot('')).toBe('');
  });
});

describe('hideUnavailableStagePlots', () => {
  it('hides every stage plot block when the live has no icons', () => {
    const hidden = hideUnavailableStagePlots(configWithPlot(), null);
    expect(hidden.blocks[0].hidden).toBe(true);
    expect(hidden.blocks[1].hidden).toBe(false);
    expect(hidden.blocks[2].fields[0].hidden).toBe(true);
  });

  it('keeps the form as is when icons are configured', () => {
    const config = configWithPlot();
    expect(hideUnavailableStagePlots(config, palette)).toBe(config);
  });
});
