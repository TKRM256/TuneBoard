import { afterEach, describe, expect, it } from 'vitest';

import { availableSteps, startTour, type TourStep } from './tour';
import { FORM_EDITOR_TOUR } from './tours/form-editor-tour';
import { SUBMISSIONS_TOUR } from './tours/submissions-tour';
import { VENUE_FORM_TOUR } from './tours/venue-form-tour';

const TOURS: Record<string, TourStep[]> = {
  フォーム作成: FORM_EDITOR_TOUR,
  会場書式: VENUE_FORM_TOUR,
  提出確認: SUBMISSIONS_TOUR,
};

/** 目印（data-tour）を探すための、テスト以外のソース */
const SOURCES = Object.entries(import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }))
  .filter(([file]) => !file.includes('.test.') && !file.includes('/tutorial/tours/'))
  .map(([, text]) => text)
  .join('\n');

describe('チュートリアル', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('画面にない部品を指す手順は飛ばす', () => {
    document.body.innerHTML = '<button data-tour="a">A</button>';
    const steps: TourStep[] = [{ title: '最初' }, { target: 'a', title: 'A' }, { target: 'b', title: 'B' }].map((step) => ({ body: '', ...step }));
    expect(availableSteps(steps).map((step) => step.title)).toEqual(['最初', 'A']);
  });

  it('案内が指す部品には、どれもソースのどこかで目印が付いている', () => {
    for (const [name, steps] of Object.entries(TOURS)) {
      for (const step of steps.filter((candidate) => candidate.target)) {
        expect(SOURCES.includes(`'${step.target}'`) || SOURCES.includes(`"${step.target}"`), `${name}: ${step.target}`).toBe(true);
      }
    }
  });

  it('押すと最初の案内が出て、次へで進む', () => {
    document.body.innerHTML = '<button data-tour="a">A</button>';
    startTour([{ title: 'はじめに', body: '説明' }, { target: 'a', title: 'ボタン A', body: 'A の説明' }]);
    expect(document.querySelector('.driver-popover-title')?.textContent).toBe('はじめに');
    expect(document.querySelector('.driver-popover-progress-text')?.textContent).toBe('1 / 2');
    (document.querySelector('.driver-popover-next-btn') as HTMLButtonElement).click();
    expect(document.querySelector('.driver-popover-title')?.textContent).toBe('ボタン A');
  });
});
