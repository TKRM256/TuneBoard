/** ランディングページの各セクション。 */
import type { ReactNode } from 'react';
import { ClipboardList, FileOutput, ScanLine, Share2, Users } from 'lucide-react';

import { GoogleLoginButton } from './GoogleLoginButton';
import { AppMock } from './AppMock';
import { DuplicateMock, FormBuilderMock, VenueFormMock } from './Mocks';
import { Reveal } from './motion';

interface LoginProps {
  isLoading: boolean;
  onLogin: () => void;
}

export function Hero({ isLoading, onLogin }: LoginProps) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-48 size-[42rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-32 -top-24 size-[32rem] rounded-full bg-emerald-400/15 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-12 pt-10 lg:grid-cols-[1.25fr_0.75fr] lg:pt-16">
        <div className="space-y-8">
          <Reveal immediate>
          <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight min-[400px]:text-3xl sm:text-5xl lg:text-[2.9rem]">
            <span className="inline-block">紙のセッティングシートを、</span>
            <span className="inline-block bg-linear-to-r from-primary to-emerald-400 bg-clip-text text-transparent">もう配らない。</span>
          </h1>
          </Reveal>
          <Reveal immediate delay={0.15}>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              出演者はリンクを開いて書くだけ。運営は届いた内容を一覧で確かめ、任意の書式に書き込んだ PDF を出力できます。
            </p>
          </Reveal>
          <Reveal immediate delay={0.3}>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <GoogleLoginButton isLoading={isLoading} onLogin={onLogin} className="shadow-lg shadow-primary/10" />
                <p className="text-sm text-muted-foreground">運営の方はこちらからログイン</p>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal immediate delay={0.25} distance={40} className="flex justify-center lg:justify-end">
          <AppMock />
        </Reveal>
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
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
      <Reveal className={`space-y-4 ${reverse ? 'lg:order-2' : ''}`}>
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <h3 className="text-balance text-2xl font-bold tracking-tight">{title}</h3>
        <p className="leading-8 text-muted-foreground">{body}</p>
      </Reveal>
      <Reveal delay={0.12} className={`flex justify-center rounded-3xl border bg-muted/40 p-6 ${reverse ? 'lg:order-1' : ''}`}>{mock}</Reveal>
    </div>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-6xl space-y-14 px-6 py-14">
      <Reveal className="space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight">できること</h2>
        <p className="text-muted-foreground">フォームづくりから、書類づくりまで</p>
      </Reveal>
      <Feature
        icon={<ClipboardList className="size-6" />}
        title="ライブにあわせて、フォームを作る"
        body="テキスト入力、選択、ステージ配置図など、用途にあわせて入力フォームを作成することができます。繰り返しグループを使えば、メンバーやセットリストなど、可変な項目も作成できます。"
        mock={<FormBuilderMock />}
      />
      <Feature
        reverse
        icon={<FileOutput className="size-6" />}
        title="任意の書式に、回答をそのまま書き込む"
        body="会場から渡された PDF や画像に入力した値を書き込むことができます。出力するPDFをオリジナルで作成することもできます。"
        mock={<VenueFormMock />}
      />
      <Feature
        icon={<ScanLine className="size-6" />}
        title="かぶった曲を見つける"
        body="同じ曲を選んだ提出があれば簡単に確認することができます。"
        mock={<DuplicateMock />}
      />
    </section>
  );
}

const steps = [
  { icon: ClipboardList, title: 'フォームを作る', body: 'ライブを作って、フォームを作成します。以前作成したフォームから取り込むこともできます。' },
  { icon: Share2, title: 'リンクを配る', body: 'フォームのリンクを出演者に送ります。記入者のログインは要りません。' },
  { icon: Users, title: '提出を確かめる', body: '提出された内容を一覧で確認できます。' },
  { icon: FileOutput, title: 'PDF を出力する', body: '提出された内容を PDF として出力します。' },
] as const;

export function Flow() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-14">
        <Reveal><h2 className="text-center text-3xl font-bold tracking-tight">使い方は 4 ステップ</h2></Reveal>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <Reveal key={title} delay={index * 0.12} className="relative rounded-2xl border bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <li className="list-none">
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <Icon className="mb-4 size-7 text-primary" />
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}