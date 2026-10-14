import { describe, expect, it } from 'vitest';

import { createBlockTemplate, type PublicSettingSheetSubmissionDetailResponse } from '../types/live-types';
import { applyAdminAnswers, collectAdminBlocks, resolveAdminOptions } from './admin-answer-model';

function detail(): PublicSettingSheetSubmissionDetailResponse {
  return {
    id: 's1',
    recordLabel: 'Band',
    submissionStatus: 'SUBMITTED',
    submittedAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    version: 0,
    itunesLinks: [],
    answers: [
      { fieldId: 'band', values: ['Band'], items: [] },
      { fieldId: 'order', values: ['1'], items: [] },
      {
        fieldId: 'members',
        values: [],
        items: [
          { answers: [{ fieldId: 'member-name', values: ['田中'], items: [] }] },
          { answers: [{ fieldId: 'member-name', values: ['佐藤'], items: [] }] },
        ],
      },
    ],
  };
}

describe('admin answer model', () => {
  it('collects admin-only blocks including those inside sections', () => {
    const section = createBlockTemplate('SECTION');
    const order = { ...createBlockTemplate('SHORT_TEXT'), id: 'order', adminOnly: true };
    section.fields = [order, createBlockTemplate('SHORT_TEXT')];
    const blocks = collectAdminBlocks({
      title: '', description: '', submitButtonLabel: '', publicSubmissionEnabled: true,
      blocks: [section, { ...createBlockTemplate('SINGLE_SELECT'), id: 'day', adminOnly: true }],
    });
    expect(blocks.map((block) => block.id)).toEqual(['order', 'day']);
  });

  it('builds options from another group answer when the block uses an option source', () => {
    const representative = {
      ...createBlockTemplate('SINGLE_SELECT'),
      optionSource: { blockId: 'members', fieldId: 'member-name' },
    };
    expect(resolveAdminOptions(representative, detail().answers)).toEqual(['田中', '佐藤']);
  });

  it('replaces only admin answers with the saved ones', () => {
    const updated = applyAdminAnswers(detail(), ['order', 'day'], [{ fieldId: 'day', values: ['夜の部'], items: [] }]);
    expect(updated.answers.map((answer) => answer.fieldId)).toEqual(['band', 'members', 'day']);
  });
});
