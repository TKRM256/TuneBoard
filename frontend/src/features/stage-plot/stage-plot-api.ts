/** ステージ設定の API。 */
import { API_BASE_URL, apiClient } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/files';

import type { PaletteItem, StagePlotSettings } from './stage-plot-types';

export interface StageBaseAsset {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface StagePlotResponse {
  settings: StagePlotSettings;
  base: StageBaseAsset | null;
}

export interface StagePlotUpdate {
  aspectRatio: number | null;
  iconScale: number | null;
  palette: PaletteItem[];
}

/** 会場書式のページから切り出す範囲（ページに対する比率 0〜1）。 */
export interface StageBaseCrop {
  assetId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function fetchStagePlot(liveId: string): Promise<StagePlotResponse | null> {
  return (await apiClient.get<StagePlotResponse>(`/lives/${liveId}/stage-plot`)) ?? null;
}

export async function saveStagePlot(liveId: string, update: StagePlotUpdate): Promise<StagePlotResponse | null> {
  return (await apiClient.post<StagePlotResponse>(`/lives/${liveId}/stage-plot`, update)) ?? null;
}

export function uploadStageBase(liveId: string, file: File): Promise<StagePlotResponse> {
  return uploadFile<StagePlotResponse>(`/lives/${liveId}/stage-plot/base`, file);
}

export async function stageBaseFromVenueForm(liveId: string, crop: StageBaseCrop): Promise<StagePlotResponse | null> {
  return (await apiClient.post<StagePlotResponse>(`/lives/${liveId}/stage-plot/base/from-venue-form`, crop)) ?? null;
}

export async function deleteStageBase(liveId: string): Promise<StagePlotResponse | null> {
  return (await apiClient.delete<StagePlotResponse>(`/lives/${liveId}/stage-plot/base`)) ?? null;
}

export async function copyStagePlotFrom(liveId: string, sourceLiveId: string): Promise<StagePlotResponse | null> {
  return (await apiClient.post<StagePlotResponse>(`/lives/${liveId}/stage-plot/copy-from`, { sourceLiveId })) ?? null;
}

/** 管理画面で下絵を取るパス（認証付きで取得する）。差し替えるとファイルが変わるので ID を付けてキャッシュを分ける。 */
export function adminStageBasePath(liveId: string, assetId: string): string {
  return `/lives/${liveId}/stage-plot/base?v=${assetId}`;
}

/** 出演者の公開フォームで下絵を表示する URL（認証なし）。 */
export function publicStagePlotBaseUrl(publicToken: string): string {
  return `${API_BASE_URL}/public/lives/${publicToken}/stage-plot/base`;
}
