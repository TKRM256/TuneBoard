/** フォーム作成画面の案内。 */
import type { TourStep } from '../tour';

export const FORM_EDITOR_TOUR: TourStep[] = [
  {
    title: 'フォームの作り方',
    body: '出演者が答えるフォームを、ブロックを並べて作ります。バンド以外の催しにも合わせて、項目は自由に変えられます。',
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
    body: '前に作ったライブのフォームを、そのまま取り込めます。毎回いちから作る必要はありません。',
    side: 'right',
  },
  {
    target: 'form-block',
    title: 'ブロック',
    body: '1 つのブロックが 1 つの質問です。上から順に、公開ページのフォームに並びます。',
    side: 'bottom',
  },
  {
    target: 'form-block-actions',
    title: '並べ替えと削除',
    body: '矢印で順番を入れ替え、ゴミ箱で消します。',
    side: 'left',
  },
  {
    target: 'form-block-settings',
    title: 'ブロックの設定',
    body: '見出し・入力の種類・選択肢・必須かどうかを決めます。\n繰り返しグループにすると、メンバーや曲のように何件でも入力できる欄になり、種類ごとに入力する項目を変えることもできます。',
    side: 'top',
  },
  {
    target: 'form-add-block',
    title: 'ブロックを足す',
    body: '「追加」から、文字・選択・はい/いいえ・曲・演奏時間・配置図などの種類を選んで足します。',
    side: 'left',
  },
  {
    target: 'form-save',
    title: '保存',
    body: '保存すると公開ページのフォームに反映されます。\n提出の一覧に出す項目は、ライブ管理の「表示設定」で選びます。',
    side: 'top',
  },
];
