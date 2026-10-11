/** 認証が必要な画像を取得し、<img> に使える object URL にする。path が null なら何もしない。 */
import { useEffect, useState } from 'react';

import { fetchBlob } from '@/lib/api/files';

export function useAuthedObjectUrl(path: string | null): { url: string | null; failed: boolean } {
  const [state, setState] = useState<{ path: string | null; url: string | null; failed: boolean }>({
    path: null,
    url: null,
    failed: false,
  });

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    fetchBlob(path, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setState({ path, url: objectUrl, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ path, url: null, failed: true });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  // 別の path に切り替わった直後は、前の画像を出さない
  if (!path || state.path !== path) return { url: null, failed: false };
  return { url: state.url, failed: state.failed };
}
