/** 提出確認画面の案内。 */
import type { TourStep } from '../tour';

export const SUBMISSIONS_TOUR: TourStep[] = [
  {
    title: '提出を確かめる',
    body: '届いた提出を一覧で確かめ、PDF にして取り出します。',
  },
  {
    target: 'submissions-duplicates',
    title: '曲かぶり',
    body: '同じ曲を選んだ提出があると、ここに出ます。表記が違っても、同じ曲として見つけます。',
    side: 'bottom',
  },
  {
    target: 'submissions-list',
    title: '提出一覧',
    body: '検索と、項目を選んでの絞り込みができます。行を押すと、提出の中身が開きます。\n管理者だけが書く項目は、その欄に直接入力します。一覧に表示する項目は、ライブ管理の「表示設定」で選びます。',
    side: 'top',
  },
  {
    target: 'submissions-pdf',
    title: 'PDF一括出力',
    body: '一覧の提出を、まとめて PDF にします。チェックで選んだときは、選んだ分だけ出力します。',
    side: 'bottom',
  },
  {
    target: 'submissions-venue-pdf',
    title: '会場書式PDF',
    body: '書式に書き込んだ PDF を出力します。先に会場書式を作っておきます。',
    side: 'bottom',
  },
  {
    target: 'submissions-trash',
    title: 'ゴミ箱',
    body: '消した提出はここに入ります。元に戻せます。',
    side: 'left',
  },
];
