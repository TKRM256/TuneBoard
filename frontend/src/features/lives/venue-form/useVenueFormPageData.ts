/** 書式エディタに必要なもの（ライブ・フォーム設定・書式・背景ファイル・提出一覧・権限）を読み込む。 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';

import {
  normalizeSettingSheetConfig,
  type LiveResponse,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionResponse,
} from '../types/live-types';
import { fetchLayout } from './venue-form-api';
import type { VenueAsset, VenueFormDocument } from './venue-form-schema';

export interface VenueFormPageData {
  live: LiveResponse;
  config: SettingSheetConfigResponse;
  name: string;
  document: VenueFormDocument;
  assets: VenueAsset[];
  submissions: SettingSheetSubmissionResponse[];
  isAdmin: boolean;
}

/** onLoaded は読み込みが終わったときに 1 回だけ呼ぶ（エディタに書式を流し込むため）。 */
export function useVenueFormPageData(
  tenantId: string | undefined,
  liveId: string | undefined,
  layoutId: string | undefined,
  onLoaded: (data: VenueFormPageData) => void,
) {
  const [data, setData] = useState<VenueFormPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    if (!tenantId || !liveId || !layoutId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [live, config, layout, submissions, tenant] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
          fetchLayout(liveId, layoutId),
          apiClient.get<SettingSheetSubmissionResponse[]>(`/lives/${liveId}/setting-sheet/submissions`),
          apiClient.get<{ role: string }>(`/tenants/get/${tenantId}`),
        ]);
        if (cancelled || !live || !config) return;
        const loaded: VenueFormPageData = {
          live,
          config: normalizeSettingSheetConfig(config),
          name: layout.name,
          document: layout.document,
          assets: layout.assets,
          submissions: submissions ?? [],
          isAdmin: tenant?.role === 'ADMIN' || tenant?.role === 'OWNER',
        };
        setData(loaded);
        onLoadedRef.current(loaded);
      } catch {
        if (!cancelled) toast.error('書式を読み込めませんでした', { position: 'top-center' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, liveId, layoutId]);

  return { data, setData, isLoading };
}
