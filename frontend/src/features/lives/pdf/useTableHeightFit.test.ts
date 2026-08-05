/** Covers how the measured height gets applied back to the selected table. */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanvasDocument } from './canvas-schema';
import { useTableHeightFit } from './useTableHeightFit';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@/lib/api/client', () => ({
  apiClient: { post },
  API_BASE_URL: '/api',
  getAccessToken: () => null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const doc: CanvasDocument = {
  page: { size: 'A4', orientation: 'LANDSCAPE', marginMm: 8, baseFontSizePt: 9 },
  elements: [],
};

describe('useTableHeightFit', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('測定した高さを 0.1mm 単位で切り上げて反映する', async () => {
    post.mockResolvedValue({ tables: [{ elementId: 'table-1', requiredHeightMm: 62.41 }] });
    const onUpdateElement = vi.fn();

    const { result } = renderHook(() =>
      useTableHeightFit({ liveId: 'live-1', submissionId: 'sub-1', doc, onUpdateElement }),
    );
    await act(() => result.current.fitHeight('table-1'));

    expect(post).toHaveBeenCalledWith('/lives/live-1/pdf-canvas/measure', {
      canvas: doc,
      submissionId: 'sub-1',
    });
    // 切り捨てると最後の行が欠けるので、必ず上へ丸める
    expect(onUpdateElement).toHaveBeenCalledWith('table-1', { hMm: 62.5 });
  });

  it('測定結果に無い表は高さを変えない', async () => {
    post.mockResolvedValue({ tables: [{ elementId: 'other', requiredHeightMm: 30 }] });
    const onUpdateElement = vi.fn();

    const { result } = renderHook(() =>
      useTableHeightFit({ liveId: 'live-1', submissionId: 'sub-1', doc, onUpdateElement }),
    );
    await act(() => result.current.fitHeight('table-1'));

    expect(onUpdateElement).not.toHaveBeenCalled();
  });

  it('プレビュー対象の提出が無ければ実行できない', async () => {
    const onUpdateElement = vi.fn();

    const { result } = renderHook(() =>
      useTableHeightFit({ liveId: 'live-1', submissionId: undefined, doc, onUpdateElement }),
    );

    expect(result.current.disabledReason).toBeTruthy();
    await act(() => result.current.fitHeight('table-1'));
    expect(post).not.toHaveBeenCalled();
  });
});
