/** ランディングページの説明に使う、画面を模した図。実際の画面の画像は使わず、枠と色だけで描く。 */
import { AlertTriangle, ArrowDown, ArrowUp, Check, ShieldCheck, Trash2 } from 'lucide-react';

import { CircleDraw, Item, Pop } from './motion';

/** 書式に回答が書き込まれたところ。✓ と ○ 囲みも付く。 */
export function VenueFormMock() {
  const row = 'flex h-7 items-center border-b border-slate-300 px-2 text-[11px] text-slate-700 last:border-b-0';
  return (
    <div className="w-full max-w-sm rotate-1 rounded-xl border bg-white p-4 text-slate-800 shadow-2xl shadow-primary/20">
      <p className="mb-3 text-center text-xs font-bold tracking-widest">出演申込書</p>
      <div className="rounded border border-slate-400">
        <div className={row}>
          <span className="w-16 bg-slate-200 py-1 pl-1 text-slate-500">バンド名</span>
          <span className="pl-2 font-medium text-slate-900">Echo Notes</span>
        </div>
        <div className={`${row} overflow-hidden`}>
          <span className="w-16 shrink-0 bg-slate-200 py-1 pl-1 text-slate-500">使用パート</span>
          {['Vocal', 'Guitar', 'Bass'].map((name, index) => (
            <span key={name} className="ml-2 flex items-center gap-0.5 whitespace-nowrap">
              <span className="relative inline-block size-2.5 border border-slate-500">
                {index === 0 || index === 2 ? (
                  <Pop delay={0.5 + index * 0.3} className="absolute -left-0.5 -top-1">
                    <Check className="size-3.5 text-red-500" strokeWidth={3} />
                  </Pop>
                ) : null}
              </span>
              {name}
            </span>
          ))}
        </div>
        <div className={row}>
          <span className="w-16 bg-slate-200 py-1 pl-1 text-slate-500">スモーク</span>
          <span className="ml-2 text-slate-900">あり</span>
          <span className="ml-2 text-slate-900">
            <CircleDraw delay={1.2}>なし</CircleDraw>
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2 text-[10px]">
        <div className="rounded border border-slate-400">
          {['アヤ　　Vo', 'ケン　　Gt', 'リョウ　Ba'].map((text) => (
            <p key={text} className="h-6 border-b border-slate-300 px-2 leading-6 last:border-b-0">{text}</p>
          ))}
        </div>
        <div className="rounded border border-slate-400">
          {['リライト', '小さな恋のうた', '風吹けば恋'].map((text) => (
            <p key={text} className="h-6 border-b border-slate-300 px-2 leading-6 last:border-b-0">{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 曲かぶりの検出。提出一覧の画面にある「曲かぶり検出」と同じ構成（見出し・重複・確信度・提出者ごとの行）にする。 */
export function DuplicateMock() {
  const rows = [
    ['Echo Notes', '小さな恋のうた', 'MONGOL800'],
    ['Neon Letters', 'ちいさなこいのうた', 'MONGOL800'],
  ];
  return (
    <div className="w-full max-w-sm space-y-3 rounded-xl border border-amber-300 bg-card p-4 text-xs shadow-sm dark:border-amber-700">
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <span className="text-sm font-semibold">曲かぶり検出</span>
        <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-white">1件の重複</span>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">重複 1</span>
          <span className="text-xs font-semibold">ちいさなこいのうた</span>
          <span className="flex items-center gap-0.5 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400">
            <ShieldCheck className="size-3" />
            高確信
          </span>
        </div>
        <div className="divide-y overflow-hidden rounded-lg border">
          {rows.map(([band, title, artist], index) => (
            <Item key={band} index={index}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-amber-50/30 px-2 py-1.5 dark:bg-amber-950/10">
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px]">{band}</span>
                <span>
                  {title}
                  <span className="text-muted-foreground"> — {artist}</span>
                </span>
              </div>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
}

/** フォーム作成画面のブロック。種類のバッジ、番号つきの名前、並べ替えと削除のボタンまで実画面と同じ。繰り返しグループの子は、親の設定の中に入る。 */
export function FormBuilderMock() {
  const buttons = (
    <div className="flex gap-1 text-muted-foreground">
      {[ArrowUp, ArrowDown, Trash2].map((Icon, index) => (
        <span key={index} className="flex size-6 items-center justify-center rounded-md border bg-background">
          <Icon className="size-3" />
        </span>
      ))}
    </div>
  );
  const head = (type: string, number: number, name: string, summary: string) => (
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-1">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold">{type}</span>
        <p className="text-xs font-medium">{number}. {name}</p>
        <p className="text-[10px] text-muted-foreground">{summary}</p>
      </div>
      {buttons}
    </div>
  );
  return (
    <div className="w-full max-w-sm space-y-2">
      <Item index={0}>
        <div className="rounded-2xl border bg-background p-3 shadow-sm">{head('短いテキスト', 1, 'バンド名', '必須')}</div>
      </Item>
      <Item index={1}>
        <div className="space-y-2 rounded-2xl border bg-background p-3 shadow-sm">
          {head('繰り返しグループ', 2, 'メンバー', '2件の子フィールド')}
          <div className="space-y-2 rounded-xl border bg-muted/30 p-2">
            <div className="rounded-xl border bg-background p-2.5">{head('短いテキスト', 1, '名前', '必須')}</div>
            <div className="rounded-xl border bg-background p-2.5">{head('複数選択', 2, '担当パート', '6件の選択肢')}</div>
          </div>
        </div>
      </Item>
    </div>
  );
}
