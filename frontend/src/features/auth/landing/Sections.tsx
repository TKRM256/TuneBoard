/** ランディングページの各セクション。 */
import type { ReactNode } from 'react';
import { ClipboardList, FileOutput, Link2, Music2, ScanLine, Share2, Users } from 'lucide-react';

import { GoogleLoginButton } from './GoogleLoginButton';
import { DuplicateMock, FormBuilderMock, VenueFormMock } from './Mocks';

interface LoginProps {
  isLoading: boolean;
  onLogin: () => void;
}

export function Hero({ isLoading, onLogin }: LoginProps) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_20%_-10%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent),radial-gradient(40rem_28rem_at_95%_10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.25fr_0.75fr] lg:pt-24">
        <div className="space-y-8">
          <p className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Music2 className="size-3.5 text-primary" />
            ライブ・発表会の出演申込を、ひとつの画面で
          </p>
          <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight min-[400px]:text-3xl sm:text-5xl lg:text-[2.9rem]">
            <span className="inline-block">紙のセッティングシートを、</span>
            <span className="inline-block bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">もう配らない。</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            出演者はリンクを開いて書くだけ。運営は届いた内容を一覧で確かめ、会場の書式に書き込んだ PDF をそのまま出力できます。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GoogleLoginButton isLoading={isLoading} onLogin={onLogin} className="shadow-lg shadow-primary/10" />
            <p className="text-sm text-muted-foreground">出演者はログイン不要です</p>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <VenueFormMock />
        </div>
      </div>
    </section>
  );
}

interface FeatureProps {
  icon: ReactNode;
  title: string;
  body: string;
  mock: ReactNode;
  reverse?: boolean;
}

function Feature({ icon, title, body, mock, reverse }: FeatureProps) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={`space-y-4 ${reverse ? 'lg:order-2' : ''}`}>
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <h3 className="text-balance text-2xl font-bold tracking-tight">{title}</h3>
        <p className="leading-8 text-muted-foreground">{body}</p>
      </div>
      <div className={`flex justify-center rounded-3xl border bg-muted/40 p-8 ${reverse ? 'lg:order-1' : ''}`}>{mock}</div>
    </div>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-6xl space-y-24 px-6 py-20">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight">できること</h2>
        <p className="text-muted-foreground">フォームづくりから、会場への提出まで</p>
      </div>
      <Feature
        icon={<ClipboardList className="size-6" />}
        title="どんな催しにも合わせて、フォームを作れる"
        body="文字・選択・はい/いいえ・曲・演奏時間・ステージ配置図を並べるだけ。メンバーや曲のように何件でも書ける欄や、種類ごとに書く項目が変わる欄も作れます。バンドにもダンスにもフェスにも使えます。"
        mock={<FormBuilderMock />}
      />
      <Feature
        reverse
        icon={<FileOutput className="size-6" />}
        title="会場の書式に、回答をそのまま書き込む"
        body="会場からもらった PDF や画像を背景にして、枠に合わせて回答を置くだけ。罫線を読み取るので、表の欄やチェック、丸囲みも、数回のクリックで置けます。出演者ごとの PDF をまとめて出力できます。"
        mock={<VenueFormMock />}
      />
      <Feature
        icon={<ScanLine className="size-6" />}
        title="曲かぶりを自動で見つける"
        body="同じ曲を選んだ提出があると、表記がちがっても同じ曲として知らせます。iTunes で曲を選べば、演奏時間も自動で入ります。"
        mock={<DuplicateMock />}
      />
    </section>
  );
}

const steps = [
  { icon: ClipboardList, title: 'フォームを作る', body: 'ライブを作って、項目を並べます。前のライブから取り込むこともできます。' },
  { icon: Share2, title: 'リンクを配る', body: '公開ページのリンクを出演者に送ります。ログインは要りません。' },
  { icon: Users, title: '提出を確かめる', body: '届いた内容を一覧で見て、曲かぶりや足りない項目を確かめます。' },
  { icon: FileOutput, title: 'PDF を出力する', body: '会場の書式に書き込んだ PDF を、提出ごとにまとめて出力します。' },
] as const;

export function Flow() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">使い方は 4 ステップ</h2>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="relative rounded-2xl border bg-card p-6 shadow-sm">
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <Icon className="mb-4 size-7 text-primary" />
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Closing({ isLoading, onLogin }: LoginProps) {
  return (
    <section className="mx-auto max-w-3xl space-y-8 px-6 py-24 text-center">
      <Link2 className="mx-auto size-10 text-primary" />
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">次のライブから、はじめてみませんか</h2>
      <p className="text-muted-foreground">Google アカウントがあれば、すぐに始められます。</p>
      <div className="flex justify-center">
        <GoogleLoginButton isLoading={isLoading} onLogin={onLogin} className="shadow-lg shadow-primary/10" />
      </div>
    </section>
  );
}
