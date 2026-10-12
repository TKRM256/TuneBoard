/** ランディングページの説明に使う、画面を模した図。実際の画面の画像は使わず、枠と色だけで描く。 */
import { Check } from 'lucide-react';

/** 会場の書式に回答が書き込まれたところ。✓ と ○ 囲みも付く。 */
export function VenueFormMock() {
  const row = 'flex h-7 items-center border-b border-slate-300 px-2 text-[11px] text-slate-700 last:border-b-0';
  return (
    <div className="w-full max-w-sm rotate-1 rounded-xl border bg-white p-4 text-slate-800 shadow-2xl shadow-primary/20">
      <p className="mb-3 text-center text-xs font-bold tracking-widest">出演申込書</p>
      <div className="rounded border border-slate-400">
        <div className={row}>
          <span className="w-16 bg-slate-200 py-1 pl-1 text-slate-500">団体名</span>
          <span className="pl-2 font-medium text-slate-900">ステップスクエア</span>
        </div>
        <div className={`${row} overflow-hidden`}>
          <span className="w-16 shrink-0 bg-slate-200 py-1 pl-1 text-slate-500">ジャンル</span>
          {['ヒップホップ', 'K-POP'].map((name, index) => (
            <span key={name} className="ml-2 flex items-center gap-0.5 whitespace-nowrap">
              <span className="relative inline-block size-2.5 border border-slate-500">
                {index === 1 ? <Check className="absolute -left-0.5 -top-1 size-3.5 text-red-500" strokeWidth={3} /> : null}
              </span>
              {name}
            </span>
          ))}
        </div>
        <div className={row}>
          <span className="w-16 bg-slate-200 py-1 pl-1 text-slate-500">出演枠</span>
          <span className="ml-2 text-slate-500">昼の部</span>
          <span className="mx-1 text-slate-400">・</span>
          <span className="rounded-full border border-red-500 px-1.5 text-slate-900">夜の部</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2 text-[10px]">
        <div className="rounded border border-slate-400">
          {['さくら　3年', 'れん　　1年', 'ゆい　　2年'].map((text) => (
            <p key={text} className="h-6 border-b border-slate-300 px-2 leading-6 last:border-b-0">{text}</p>
          ))}
        </div>
        <div className="rounded border border-slate-400">
          {['オープニング 2:45', 'メドレー 6:30', 'エンディング 1:05'].map((text) => (
            <p key={text} className="h-6 border-b border-slate-300 px-2 leading-6 last:border-b-0">{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 曲かぶりの検出。同じ曲が 2 件の提出に出ている。 */
export function DuplicateMock() {
  const item = (band: string, title: string, hit: boolean) => (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${hit ? 'border-amber-400/60 bg-amber-500/10' : 'bg-card'}`}>
      <span className="font-medium">{band}</span>
      <span className="text-muted-foreground">{title}</span>
    </div>
  );
  return (
    <div className="w-full max-w-xs space-y-2">
      {item('Echo Notes', '小さな恋のうた', true)}
      {item('Neon Letters', 'ちいさなこいのうた', true)}
      {item('Blue Harbor', 'リライト', false)}
      <p className="pt-1 text-center text-xs font-medium text-amber-600 dark:text-amber-400">表記がちがっても同じ曲として見つけます</p>
    </div>
  );
}

/** フォームのブロックを並べるところ。 */
export function FormBuilderMock() {
  const block = (kind: string, label: string, accent: string) => (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${accent}`}>{kind}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
  return (
    <div className="w-full max-w-xs space-y-2">
      {block('文字', '団体名', 'bg-sky-500/15 text-sky-700 dark:text-sky-300')}
      {block('選択', 'ジャンル', 'bg-violet-500/15 text-violet-700 dark:text-violet-300')}
      <div className="space-y-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-2">
        {block('繰り返し', '出演者', 'bg-primary/15 text-primary')}
        <div className="ml-4 space-y-2">
          {block('文字', '名前', 'bg-sky-500/15 text-sky-700 dark:text-sky-300')}
          {block('選択', '学年', 'bg-violet-500/15 text-violet-700 dark:text-violet-300')}
        </div>
      </div>
      {block('曲', '使用曲', 'bg-rose-500/15 text-rose-700 dark:text-rose-300')}
    </div>
  );
}
