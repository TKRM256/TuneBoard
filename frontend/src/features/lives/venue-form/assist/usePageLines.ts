/** 今のページの背景から検出した罫線（mm）。背景のファイルは変わらないので、一度取ったものは使い回す。 */
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';

import type { VenueAsset, VenuePage } from '../venue-form-schema';
import { backgroundAspect, toPageLines, type PageLine, type RuledLine } from './ruled-lines';

const cache = new Map<string, RuledLine[]>();

function linesPath(liveId: string, assetId: string, pageIndex: number) {
  return `/lives/${liveId}/venue-form/assets/${assetId}/pages/${pageIndex}/lines`;
}

export function usePageLines(liveId: string, page: VenuePage | null, assets: VenueAsset[]): PageLine[] {
  const background = page?.background ?? null;
  const path = background ? linesPath(liveId, background.assetId, background.pageIndex) : null;
  const [loaded, setLoaded] = useState<{ path: string; lines: RuledLine[] } | null>(null);

  useEffect(() => {
    if (!path || cache.has(path)) return;
    let cancelled = false;
    apiClient.get<{ lines: RuledLine[] }>(path)
      .then((response) => {
        const lines = response?.lines ?? [];
        cache.set(path, lines);
        if (!cancelled) setLoaded({ path, lines });
      })
      // 検出できなくても、吸着などの補助が効かないだけでエディタは使える
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [path]);

  const raw = path ? cache.get(path) ?? (loaded?.path === path ? loaded.lines : null) : null;
  const aspect = page ? backgroundAspect(page, assets) : null;
  return useMemo(
    () => (raw && page && aspect ? toPageLines(raw, page, aspect) : []),
    [raw, page, aspect],
  );
}
