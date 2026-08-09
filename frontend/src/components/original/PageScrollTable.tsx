import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * ページ全体のスクロールに任せるテーブル。
 * shadcn の Table は内側に横スクロール領域を作るため、
 * 一覧のように「ブラウザのスクロールバーで動かしたい」場面ではこちらを使う。
 * 親要素に `w-max min-w-full` を付けると、テーブルの幅までカードが広がる。
 */
export const PageScrollTable = ({ className, ...props }: ComponentProps<'table'>) => (
  <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
);
