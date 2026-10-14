/** 画面上で 1 手ずつ案内する（チュートリアル）。案内する部品には data-tour="名前" を付けておく。 */
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

import './tour.css';

export interface TourStep {
  /** 指し示す部品の data-tour。無ければ画面の中央に出す */
  target?: string;
  title: string;
  body: string;
  /** 吹き出しを出す向き */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function tourSelector(target: string) {
  return `[data-tour="${target}"]`;
}

/** 画面にない部品（まだ何も置いていないときの要素など）を指す手順は飛ばす。 */
export function availableSteps(steps: TourStep[], root: ParentNode = document): TourStep[] {
  return steps.filter((step) => !step.target || root.querySelector(tourSelector(step.target)) !== null);
}

export function startTour(steps: TourStep[]) {
  const available = availableSteps(steps);
  if (available.length === 0) return;
  const tour = driver({
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '次へ',
    prevBtnText: '戻る',
    doneBtnText: '終わる',
    popoverClass: 'tuneboard-tour',
    stagePadding: 6,
    stageRadius: 8,
    steps: available.map((step): DriveStep => ({
      element: step.target ? tourSelector(step.target) : undefined,
      popover: { title: step.title, description: step.body, side: step.side, align: 'start' },
    })),
  });
  tour.drive();
}
