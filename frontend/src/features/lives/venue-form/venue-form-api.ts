/** 会場書式の API。 */
import { apiClient } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/files';

import { postForBlob, type PdfFetchResult } from '../pdf/pdf-api';
import type { VenueAsset, VenueFormDocument } from './venue-form-schema';

export interface VenueFormResponse {
  document: VenueFormDocument | null;
  assets: VenueAsset[];
}

export async function fetchVenueForm(liveId: string): Promise<VenueFormResponse> {
  return (await apiClient.get<VenueFormResponse>(`/lives/${liveId}/venue-form`)) ?? { document: null, assets: [] };
}

export async function saveVenueForm(liveId: string, document: VenueFormDocument): Promise<VenueFormResponse> {
  return (await apiClient.post<VenueFormResponse>(`/lives/${liveId}/venue-form`, { document })) ?? { document, assets: [] };
}

export function uploadVenueAsset(liveId: string, file: File): Promise<VenueAsset> {
  return uploadFile<VenueAsset>(`/lives/${liveId}/venue-form/assets`, file);
}

export async function copyVenueFormFrom(liveId: string, sourceLiveId: string): Promise<VenueFormResponse> {
  return (await apiClient.post<VenueFormResponse>(`/lives/${liveId}/venue-form/copy-from`, { sourceLiveId }))
    ?? { document: null, assets: [] };
}

export async function checkVenueForm(liveId: string, submissionId: string, document: VenueFormDocument): Promise<string[]> {
  const response = await apiClient.post<{ warnings: string[] }>(`/lives/${liveId}/venue-form/check`, { submissionId, document });
  return response?.warnings ?? [];
}

/** document を省くと、保存済みの書式で出力する。 */
export function fetchVenueFormPdf(liveId: string, submissionId: string, document?: VenueFormDocument): Promise<PdfFetchResult> {
  return postForBlob(`/lives/${liveId}/venue-form/submissions/${submissionId}/pdf`, document ? { document } : {}, {});
}

export function fetchVenueFormZip(liveId: string, submissionIds: string[], document?: VenueFormDocument): Promise<PdfFetchResult> {
  return postForBlob(`/lives/${liveId}/venue-form/submissions/zip`, document ? { submissionIds, document } : { submissionIds }, {});
}

/** 背景ページのプレビュー画像のパス（認証付きで取得する）。 */
export function venuePagePreviewPath(liveId: string, assetId: string, pageIndex: number): string {
  return `/lives/${liveId}/venue-form/assets/${assetId}/pages/${pageIndex}`;
}
