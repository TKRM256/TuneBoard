/**
 * ログイン後の各ページの先頭。パンくず・戻る・見出し・操作ボタンの位置を全ページでそろえる。
 * スマホではパンくずを 1 行に収めて今のページ名を省き、操作ボタンは見出しの下に回す。
 */
import { Fragment, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';

export interface Crumb {
  label: string;
  /** 省略すると今のページとして表示する */
  to?: string;
}

interface PageHeaderProps {
  crumbs?: Crumb[];
  /** 戻る先。省略すると戻るボタンを出さない */
  backTo?: string;
  title: ReactNode;
  /** 見出しの横に並べる札（公開状態など） */
  badge?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ crumbs, backTo, title, badge, description, actions }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {crumbs && crumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            {crumbs.map((crumb, index) => (
              <Fragment key={`${index}-${crumb.label}`}>
                {index > 0 ? <BreadcrumbSeparator className={crumb.to ? undefined : 'hidden sm:block'} /> : null}
                <BreadcrumbItem className={crumb.to ? undefined : 'hidden sm:inline-flex'}>
                  {crumb.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.to}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {backTo ? <BackButton to={backTo} /> : null}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="wrap-break-word text-lg font-semibold sm:text-2xl">{title}</h1>
                  {badge}
                </div>
                {description ? <p className="text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

/** 戻るボタン。全画面のエディタの帯でも同じ見た目にする。 */
export function BackButton({ to }: { to: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="shrink-0">
      <Link to={to}>
        <ChevronLeft className="size-4" />
        戻る
      </Link>
    </Button>
  );
}
