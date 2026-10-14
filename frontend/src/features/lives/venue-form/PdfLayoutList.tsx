/** PDF 書式の並び。提出を選んで来たときは、書式ごとにそのまま PDF を保存できる。 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, LayoutList, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import type { useLayoutDownload } from './use-layout-download';
import type { LayoutSummary } from './venue-form-api';

interface Props {
  layouts: LayoutSummary[];
  editorPath: (layoutId: string) => string;
  /** 消せる人だけ渡す */
  onDelete?: (layout: LayoutSummary) => void;
  /** 出力する提出があるときだけ渡す */
  exporter?: ReturnType<typeof useLayoutDownload> & { count: number };
}

export function PdfLayoutList({ layouts, editorPath, onDelete, exporter }: Props) {
  if (layouts.length === 0 && !exporter) {
    return (
      <Card className="items-center gap-2 px-4 py-10 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">書式はまだありません</p>
      </Card>
    );
  }
  const saveButton = (layoutId: string | null, name: string) => exporter ? (
    <Button
      size="sm"
      className="shrink-0 gap-1"
      onClick={() => void exporter.download(layoutId)}
      disabled={exporter.isBusy}
      aria-label={`${name}で保存`}
    >
      {exporter.isPending(layoutId) ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {exporter.count > 1 ? 'Zipで保存' : 'PDFを保存'}
    </Button>
  ) : null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {layouts.map((layout) => (
        <li key={layout.id}>
          <Card className="flex-row items-center gap-3 px-4 py-3">
            <Link to={editorPath(layout.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <LayoutLabel icon={<FileText className="size-5" />} name={layout.name} detail={`${layout.pageCount}ページ`} />
            </Link>
            {saveButton(layout.id, layout.name)}
            {onDelete && !exporter ? (
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`${layout.name}を消す`} onClick={() => onDelete(layout)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            ) : null}
          </Card>
        </li>
      ))}
      {exporter ? (
        <li>
          <Card className="flex-row items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <LayoutLabel icon={<LayoutList className="size-5" />} name="テンプレート" detail="フォームの項目順" />
            </div>
            {saveButton(null, 'テンプレート')}
          </Card>
        </li>
      ) : null}
    </ul>
  );
}

function LayoutLabel({ icon, name, detail }: { icon: ReactNode; name: string; detail: string }) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </>
  );
}
