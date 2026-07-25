/** Popover that lets the user insert `${...}` snippets into a text-like input
 *  by clicking categorized variables / helpers.
 *
 *  注意: PopoverContent は body にポータルされるため、Dialog の中で使うと
 *  スクロールロックに阻まれて一覧をスクロールできない。モーダル内では
 *  ExpressionSnippetList を直接埋め込むこと。 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { FieldCatalog } from '../field-catalog';
import { ExpressionSnippetList } from './ExpressionSnippetList';

interface Props {
  catalog: FieldCatalog;
  onInsert: (snippet: string) => void;
  buttonLabel?: string;
  size?: 'sm' | 'icon';
}

export function ExpressionSnippetPicker({ catalog, onInsert, buttonLabel = '式を挿入', size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {size === 'icon' ? (
          <Button variant="ghost" size="icon" className="size-7" aria-label={buttonLabel}>
            <Sparkles className="size-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Sparkles className="size-3.5" />
            {buttonLabel}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <ExpressionSnippetList
          catalog={catalog}
          onInsert={(snippet) => {
            onInsert(snippet);
            setOpen(false);
          }}
          className="h-[440px]"
        />
      </PopoverContent>
    </Popover>
  );
}
