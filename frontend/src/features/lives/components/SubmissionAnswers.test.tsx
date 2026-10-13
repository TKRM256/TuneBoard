import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { SettingSheetBlock, SettingSheetSubmissionAnswerResponse } from '../types/live-types';
import { SubmissionAnswers } from './SubmissionAnswers';

function block(id: string, type: SettingSheetBlock['type'], label: string, fields: SettingSheetBlock[] = []): SettingSheetBlock {
  return {
    id, type, label, description: '', hidden: false, required: false, collapsible: false, appearance: 'plain', itemAppearance: 'outline',
    options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields,
    layout: { width: 'full', optionColumns: null, optionFitContent: null }, optionSource: null, duplicateDetectionRole: '',
  } as unknown as SettingSheetBlock;
}

const answer = (fieldId: string, ...values: string[]): SettingSheetSubmissionAnswerResponse => ({ fieldId, values, items: [] });

const setlist = block('setlist', 'REPEATABLE_GROUP', 'セットリスト', [
  block('title', 'SHORT_TEXT', '曲名'),
  block('pa', 'LONG_TEXT', 'PAへの要望'),
  block('light', 'LONG_TEXT', '照明への要望'),
  block('mics', 'REPEATABLE_GROUP', '使うマイク', [block('mic', 'SHORT_TEXT', '担当')]),
]);
setlist.titleSourceFieldId = 'title';

afterEach(cleanup);

describe('提出内容の表示', () => {
  it('繰り返しの 1 件ごとに番号と表題を付け、項目を 1 行ずつ分けて並べる', () => {
    render(
      <SubmissionAnswers
        path="s1"
        blocks={[block('band', 'SECTION', 'バンド', [block('name', 'SHORT_TEXT', 'バンド名')]), setlist]}
        answers={[
          answer('name', 'Echo'),
          {
            fieldId: 'setlist', values: [], items: [
              { variantId: null, answers: [answer('title', '夏祭り'), answer('pa', 'リバーブ多め'), answer('light', '赤系で')] },
            ],
          } as unknown as SettingSheetSubmissionAnswerResponse,
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'バンド' })).toBeInTheDocument();
    const item = screen.getByRole('listitem');
    expect(within(item).getByText('夏祭り', { selector: 'p' })).toBeInTheDocument();
    const rows = within(item).getAllByRole('term').map((term) => term.parentElement);
    const labels = rows.map((row) => row?.querySelector('dt')?.textContent);
    expect(labels).toEqual(['曲名', 'PAへの要望', '照明への要望', '使うマイク']);
    // PA と照明は別の行に入る
    expect(rows[1]).toHaveTextContent('リバーブ多め');
    expect(rows[1]).not.toHaveTextContent('赤系で');
    expect(rows[2]).toHaveTextContent('赤系で');
    // 中身のない入れ子の繰り返しは 1 行で未入力と出す
    expect(rows[3]).toHaveTextContent('未入力');
  });

  it('答えていない項目は未入力と出す', () => {
    render(<SubmissionAnswers path="s2" blocks={[block('memo', 'LONG_TEXT', '備考')]} answers={[]} />);
    expect(screen.getByRole('definition')).toHaveTextContent('未入力');
  });
});
