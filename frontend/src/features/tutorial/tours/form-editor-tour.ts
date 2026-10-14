/** フォーム作成画面の案内。 */
import type { TourStep } from '../tour';

export const FORM_EDITOR_TOUR: TourStep[] = [
  {
    title: 'フォームの作り方',
    body: '出演者が開くフォームを、質問を並べて作ります。ライブごとに項目を変えられます。',
  },
  {
    target: 'form-settings',
    title: 'フォーム全体の設定',
    body: 'タイトル、送信ボタンの文言、説明を決めます。\n「初期値に戻す」を押すとバンド向けの既定のフォームに戻り、「空から作る」を押すと何もない状態から作れます。',
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
    body: '質問1つが、1つのブロックです。ブロックを並べて、フォームを作ります。',
    side: 'bottom',
  },
  {
    target: 'form-add-block',
    title: 'ブロックを足す',
    body: '「追加」を押すと、ブロックが1つ増えます。',
    side: 'left',
  },
  {
    target: 'form-block-settings',
    title: 'ブロックの設定',
    body: '見出しや入力の種類、選択肢を決めます。\n「繰り返しグループ」にすると、メンバーや曲のように人数や曲数が決まっていない質問を、何件でも書ける欄にできます。',
    side: 'top',
  },
  {
    target: 'form-block-actions',
    title: '並べ替えと削除',
    body: '矢印で順番を入れ替え、ゴミ箱で消します。',
    side: 'left',
  },
  {
    target: 'form-save',
    title: '保存',
    body: '保存すると、公開ページのフォームに反映されます。',
    side: 'top',
  },
];
