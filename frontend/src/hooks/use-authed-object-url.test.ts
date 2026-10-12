import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthedObjectUrl } from './use-authed-object-url';

const fetchBlob = vi.fn<(path: string, signal: AbortSignal) => Promise<Blob>>();
vi.mock('@/lib/api/files', () => ({ fetchBlob: (path: string, signal: AbortSignal) => fetchBlob(path, signal) }));

describe('useAuthedObjectUrl', () => {
  const revoked = new Set<string>();
  let counter = 0;

  beforeEach(() => {
    counter = 0;
    revoked.clear();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test/${++counter}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => { revoked.add(url); });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetchBlob.mockReset();
  });

  it('別の画像へ切り替えてすぐ戻っても、破棄した URL は使わない', async () => {
    // B は読み込みが終わらないまま A に戻る
    fetchBlob.mockImplementation((path) => (path === 'B' ? new Promise<Blob>(() => {}) : Promise.resolve(new Blob(['x']))));
    const { result, rerender } = renderHook(({ path }) => useAuthedObjectUrl(path), { initialProps: { path: 'A' } });
    await waitFor(() => expect(result.current.url).toBe('blob:test/1'));

    rerender({ path: 'B' });
    act(() => rerender({ path: 'A' }));

    expect(revoked.has('blob:test/1')).toBe(true);
    expect(result.current.url).not.toBe('blob:test/1');
    await waitFor(() => expect(result.current.url).toBe('blob:test/2'));
  });
});
