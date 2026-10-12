/** 会場書式エディタの案内。 */
import type { TourStep } from '../tour';

export const VENUE_FORM_TOUR: TourStep[] = [
  {
    title: '会場書式の作り方',
    body: '会場からもらった書式を背景にして、その上に回答を書き込む場所を置きます。出力すると、提出ごとに書式へ書き込んだ PDF ができます。',
  },
  {
    target: 'venue-import',
    title: '書式を取り込む',
    body: '会場の書式の PDF か画像を取り込みます。ページごとに背景になります。',
    side: 'right',
  },
  {
    target: 'venue-palette',
    title: '要素を置く',
    body: '項目の値・自由な文字・丸囲み・アイコン・ステージ配置図を置けます。置いたらドラッグで書式の欄に合わせます。',
    side: 'right',
  },
  {
    target: 'venue-canvas',
    title: '拡大と移動',
    body: 'Ctrl を押しながらホイールで拡大・縮小、スペースを押しながらドラッグで表示する場所を動かします。',
    side: 'left',
  },
  {
    target: 'venue-canvas',
    title: '欄に合わせる',
    body: '要素をダブルクリックすると、その欄の罫線いっぱいに広がります。\nAlt を押しながら動かすと、罫線に吸い付きます。',
    side: 'left',
  },
  {
    target: 'venue-canvas',
    title: 'まとめて選ぶ',
    body: '何もないところからドラッグして四角で囲むと、中の要素をまとめて選べます。Shift を押しながら囲むと選択に足せます。',
    side: 'left',
  },
  {
    target: 'venue-lines',
    title: '罫線を表示',
    body: '書式から読み取った罫線を表示します。吸着やダブルクリックは、この罫線に合わせます。',
    side: 'bottom',
  },
  {
    target: 'venue-table-tool',
    title: '表の欄に項目を並べる',
    body: '押してから書式の表をドラッグで囲むと、行と列を読み取ります。グループと列ごとの項目を選ぶと、マスごとに何件目の回答を書く欄ができます。',
    side: 'bottom',
  },
  {
    target: 'venue-marker-tool',
    title: '選択肢の印を置く',
    body: '項目と印の種類を選び、選択肢ごとに書式の上の場所をクリックしていきます。選ばれた選択肢のところにだけ印が出ます。',
    side: 'bottom',
  },
  {
    target: 'venue-properties',
    title: '要素の設定',
    body: '選んだ要素の位置・大きさ・文字の大きさ・表示条件を変えます。\n複数選んだときは、どれにもある設定をまとめて変えられます。長い回答は「1 行に縮めて収める」で欄に収まります。',
    side: 'left',
  },
  {
    target: 'venue-canvas',
    title: 'コピーと次の件',
    body: 'Ctrl+C でコピー、Ctrl+V で貼り付けです。\nCtrl+Shift+V は「次の件」として貼り付け、何件目の番号を 1 つ進めて、表の下の欄に置きます。',
    side: 'left',
  },
  {
    target: 'venue-sample',
    title: '見本の提出',
    body: '選んだ提出の回答で、書式の上に実際の値を表示します。',
    side: 'bottom',
  },
  {
    target: 'venue-preview',
    title: 'プレビュー',
    body: '出力される PDF をその場で確かめます。',
    side: 'bottom',
  },
  {
    target: 'venue-save',
    title: '保存',
    body: '保存すると、提出の一覧の「会場書式PDF」から出力できます。',
    side: 'bottom',
  },
];
