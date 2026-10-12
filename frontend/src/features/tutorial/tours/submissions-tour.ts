/** 提出確認画面の案内。 */
import type { TourStep } from '../tour';

export const SUBMISSIONS_TOUR: TourStep[] = [
  {
    title: '提出内容を確かめる',
    body: '提出内容を一覧で確かめ、PDF にして取り出します。',
  },
  {
    target: 'submissions-duplicates',
    title: '曲かぶり',
    body: '同じ曲を選んだ提出が表示されます。',
    side: 'bottom',
  },
  {
    target: 'submissions-list',
    title: '提出一覧',
    body: '検索と、項目を選んでの絞り込みができます。詳細を見たい行を押すと、提出内容が表示されます。\n一覧に表示する項目は、ライブ管理の「表示設定」で選びます。',
    side: 'top',
  },
  {
    target: 'submissions-pdf',
    title: 'PDF一括出力',
    body: '提出された内容を PDF にします。チェックで選んだときは、選んだ分だけ出力します。',
    side: 'bottom',
  },
  {
    target: 'submissions-venue-pdf',
    title: '書式つきのPDF',
    body: '任意の書式に書き込んだ PDF を出力します。出力するには先に会場書式を作っておきます。',
    side: 'bottom',
  },
  {
    target: 'submissions-trash',
    title: 'ゴミ箱',
    body: '削除された提出はここに入ります。30日が経つと完全に削除され、もとに戻せなくなります。',
    side: 'left',
  },
];
