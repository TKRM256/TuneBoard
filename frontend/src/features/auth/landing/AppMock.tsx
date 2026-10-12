/** ランディングページの先頭に出す、出演者が入力する画面（公開ページ）を模した図。実際の画面と同じ配置・配色にする。 */
import { Plus } from 'lucide-react';

import { Item } from './motion';

function Field({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="space-y-1 rounded-lg border bg-background p-2">
      <p className="text-[9px] font-medium">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </p>
      <div className="flex h-5 items-center justify-between rounded border bg-background px-1.5 text-[9px]">
        <span>{value}</span>
      </div>
    </div>
  );
}

export function AppMock() {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl border bg-muted/40 text-foreground shadow-2xl shadow-primary/20">
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-3 truncate text-[10px] text-muted-foreground">出演者の入力画面 ログインは要りません</span>
      </div>
      <div className="grid grid-cols-[0.8fr_1.6fr] gap-3 p-3 text-[10px]">
        {/* 左：ライブの情報 */}
        <div className="space-y-1.5 rounded-lg border bg-card p-2.5">
          <p className="text-sm font-bold leading-snug">春ライブ</p>
          <p className="text-[9px] text-muted-foreground">学内ホール</p>
          <p className="rounded border px-2 py-1 text-center text-[9px]">提出済み一覧</p>
        </div>
        {/* 右：入力フォーム */}
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <p className="text-[11px] font-bold">セッティングシート回答</p>
          <Item index={0}>
            <Field label="バンド名" value="Echo Notes" required />
          </Item>
          <Item index={1}>
            <div className="space-y-1.5 rounded-lg border bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-medium">メンバー</p>
                <span className="flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[8px]">
                  <Plus className="size-2.5" />
                  メンバー追加
                </span>
              </div>
              {[['アヤ', 'Vocal'], ['ケン', 'Guitar']].map(([name, part]) => (
                <div key={name} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-[9px]">
                  <span className="font-medium">{name}</span>
                  <span className="rounded bg-primary/10 px-1.5 text-primary">{part}</span>
                </div>
              ))}
            </div>
          </Item>
          <Item index={2}>
            <div className="flex items-center justify-between rounded-lg border bg-background p-2 text-[9px]">
              <span className="font-medium">小さな恋のうた</span>
              <span className="text-muted-foreground">MONGOL800 3:24</span>
            </div>
          </Item>
        </div>
      </div>
    </div>
  );
}
