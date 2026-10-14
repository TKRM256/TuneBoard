/** 何も置いていない白紙の書式に、今のフォームの項目を順に並べる。用紙の大きさは今の書式に合わせる。 */
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import { fitAllPages } from './page-resize';
import type { useVenueFormEditor } from './useVenueFormEditor';
import { fetchFormTemplate } from './venue-form-api';

interface Props {
  liveId: string;
  editor: ReturnType<typeof useVenueFormEditor>;
  onFilled?: () => void;
}

export function FormTemplateFill({ liveId, editor, onFilled }: Props) {
  const fill = useSingleFlight();
  const { doc } = editor;
  const paper = doc.pages[0];
  if (!paper || doc.elements.length > 0 || doc.pages.some((page) => page.background)) return null;

  const handleFill = () => void fill.run(async () => {
    try {
      const template = await fetchFormTemplate(liveId);
      const fitted = fitAllPages(template, { widthMm: paper.widthMm, heightMm: paper.heightMm });
      editor.replaceAll({ ...fitted, pages: fitted.pages.map((page) => ({ ...page, marginMm: paper.marginMm ?? page.marginMm })) });
      toast.success('フォームの項目を並べました', { position: 'top-center' });
      onFilled?.();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? 'フォームから並べられませんでした', { position: 'top-center' });
    }
  });

  return (
    <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleFill} disabled={fill.isRunning}>
      {fill.isRunning ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
      フォームの項目を並べる
    </Button>
  );
}
