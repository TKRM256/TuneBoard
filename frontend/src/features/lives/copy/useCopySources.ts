/** 取り込み元候補のライブ一覧を、ダイアログを開いたときだけ読み込む。 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { LiveCopySourceResponse } from '../types/live-types';
import { fetchCopySources } from './copy-api';

export function useCopySources(open: boolean, excludeLiveId?: string) {
  const [sources, setSources] = useState<LiveCopySourceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetchCopySources();
        if (!cancelled) {
          setSources(response.filter((source) => source.id !== excludeLiveId));
        }
      } catch {
        if (!cancelled) {
          toast.error('ライブ一覧の取得に失敗しました', { position: 'top-center' });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, excludeLiveId]);

  return { sources, isLoading };
}
