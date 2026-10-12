/** フォーム作成画面の案内。 */
import type { TourStep } from '../tour';

export const FORM_EDITOR_TOUR: TourStep[] = [
  {
    title: 'フォームの作り方',
    body: '出演者が回答するフォームを作成できます。',
  },
  {
    target: 'form-settings',
    title: 'フォーム全体の設定',
    body: 'フォームのタイトル・送信ボタンの文言・説明を決めます。\n「初期値に戻す」でバンド向けの既定のフォームに、「空から作る」で何もない状態に戻せます。',
    side: 'right',
  },
  {
    target: 'form-copy',
    title: '前のライブから取り込む',
    body: '前に作ったライブのフォームを、そのまま取り込めます。',
    side: 'right',
  },
  {
    target: 'form-block',
    title: 'ブロック',
    body: '一つの質問 = 一つのブロックでフォームを作成します。',
    side: 'bottom',
  },
  {
    target: 'form-block-actions',
    title: '並べ替えと削除',
    body: 'ブロックの順番の並び変えおよび削除ができます。',
    side: 'left',
  },
  {
    target: 'form-block-settings',
    title: 'ブロックの設定',
    body: 'ブロックの詳細を設定できます。\n繰り返しグループにすると、メンバーや曲のように何件でも入力できる欄になります。',
    side: 'top',
  },
  {
    target: 'form-add-block',
    title: 'ブロックを足す',
    body: '「追加」からブロックを追加することができます。',
    side: 'left',
  },
  {
    target: 'form-save',
    title: '保存',
    body: '保存すると公開ページのフォームに反映されます。',
    side: 'top',
  },
];
