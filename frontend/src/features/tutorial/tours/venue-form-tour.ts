/** 会場書式エディタの案内。主な手順、補助の操作、確認と保存の順に並べる。 */
import type { TourStep } from '../tour';

export const VENUE_FORM_TOUR: TourStep[] = [
  {
    title: '会場書式の作り方',
    body: '会場から渡された用紙を、このエディタでは「書式」と呼びます。書式を背景にして、その上に回答を書き込む場所を置くと、提出ごとに書き込んだ PDF を出力できます。',
  },
  {
    target: 'venue-import',
    title: '書式を取り込む',
    body: '書式の PDF か画像を取り込みます。ページごとに背景になります。',
    side: 'right',
  },
  {
    target: 'venue-palette',
    title: '要素を置く',
    body: '回答を書き込む場所を「要素」と呼びます。項目の値、自由な文字、丸囲み、アイコン、ステージ配置図を置けます。置いたら、ドラッグで書式の欄に合わせます。',
    side: 'right',
  },
  {
    target: 'venue-lines',
    title: '罫線を表示',
    body: '書式の枠や表の線を「罫線」として読み取り、画面に表示します。次の手順の吸着や、欄いっぱいへの拡大は、この罫線が基準です。',
    side: 'bottom',
  },
  {
    target: 'venue-canvas',
    title: '欄に合わせる',
    body: '要素をダブルクリックすると、その欄の罫線いっぱいに広がります。\nAlt を押しながら動かすと、罫線にぴたっと揃います。',
    side: 'left',
  },
  {
    target: 'venue-table-tool',
    title: '表の欄に項目を並べる',
    body: '「表の欄に項目を並べる」を押し、書式の表をドラッグで囲むと、行と列を読み取ります。\n次に、フォームで作った繰り返しグループと、列ごとの項目を選びます。すると、マスごとに1件目、2件目の回答を書く欄ができます。',
    side: 'bottom',
  },
  {
    target: 'venue-marker-tool',
    title: '選択肢の印を置く',
    body: '「選択肢の印を置く」を押し、項目と印の種類を選びます。選択肢の名前が順に表示されるので、書式の上の対応する場所をクリックします。選ばれた選択肢の場所にだけ印が出ます。',
    side: 'bottom',
  },
  {
    target: 'venue-canvas',
    title: 'まとめて選ぶ',
    body: '何もないところからドラッグして四角で囲むと、中の要素をまとめて選べます。Shift を押しながら囲むと、今の選択に足せます。',
    side: 'left',
  },
  {
    target: 'venue-properties',
    title: '要素の設定',
    body: '位置、大きさ、文字の大きさ、表示条件を変えます。\n複数の要素を選ぶと、共通する設定をまとめて変えられます。欄より長い回答は、「1 行に縮めて収める」を使うと欄に収まります。',
    side: 'left',
  },
  {
    target: 'venue-canvas',
    title: 'コピーと次の件',
    body: 'Ctrl+Shift+V は「次の件」として貼り付けます。何件目かの番号が1つ進み、表の下の欄に置かれます。\n普通のコピーと貼り付けは、Ctrl+C と Ctrl+V です。',
    side: 'left',
  },
  {
    target: 'venue-canvas',
    title: '拡大と移動',
    body: 'Ctrl を押しながらホイールで拡大と縮小、スペースを押しながらドラッグで表示する場所を動かします。',
    side: 'left',
  },
  {
    target: 'venue-sample',
    title: '見本の提出',
    body: '選んだ提出の回答を、書式の上に実際の値で表示します。',
    side: 'bottom',
  },
  {
    target: 'venue-preview',
    title: 'プレビュー',
    body: '出力される PDF の仕上がりを、その場で確かめられます。',
    side: 'bottom',
  },
  {
    target: 'venue-save',
    title: '保存',
    body: '保存すると、提出確認の「会場書式PDF」から出力できます。',
    side: 'bottom',
  },
];
