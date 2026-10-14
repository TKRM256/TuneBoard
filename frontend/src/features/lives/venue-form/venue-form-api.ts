/** PDF 書式の API。1 つのライブに複数の書式を持ち、背景のファイルはライブの書式すべてで共有する。 */
import { apiClient } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/files';

import { postForBlob, type PdfFetchResult } from './blob-download';
import type { VenueAsset, VenueFormDocument } from './venue-form-schema';

export interface LayoutSummary {
  id: string;
  name: string;
  pageCount: number;
}

export interface LayoutResponse {
  id: string;
  name: string;
  document: VenueFormDocument;
  assets: VenueAsset[];
  /** 読み込んだときの版の印。保存のときに送り返す */
  revision?: string;
}

/** FORM はフォームの項目を並べて作る。BLANK は白紙から。 */
export type LayoutSource = 'FORM' | 'BLANK';

const base = (liveId: string) => `/lives/${liveId}/pdf-layouts`;

export async function fetchLayouts(liveId: string): Promise<LayoutSummary[]> {
  return (await apiClient.get<LayoutSummary[]>(base(liveId))) ?? [];
}

/** 今のフォームの項目を順に並べた書式（保存はされない）。 */
export async function fetchFormTemplate(liveId: string): Promise<VenueFormDocument> {
  const response = await apiClient.get<VenueFormDocument>(`${base(liveId)}/form-template`);
  if (!response) throw new Error('フォームから並べられませんでした');
  return response;
}

export async function fetchLayout(liveId: string, layoutId: string): Promise<LayoutResponse> {
  const response = await apiClient.get<LayoutResponse>(`${base(liveId)}/${layoutId}`);
  if (!response) throw new Error('書式を読み込めませんでした');
  return response;
}

export async function createLayout(liveId: string, name: string, source: LayoutSource): Promise<LayoutResponse> {
  const response = await apiClient.post<LayoutResponse>(base(liveId), { name, source });
  if (!response) throw new Error('書式を作れませんでした');
  return response;
}

export async function saveLayout(liveId: string, layoutId: string, name: string, document: VenueFormDocument, baseRevision?: string): Promise<LayoutResponse> {
  const response = await apiClient.put<LayoutResponse>(`${base(liveId)}/${layoutId}`, { name, document, baseRevision });
  if (!response) throw new Error('書式を保存できませんでした');
  return response;
}

export async function deleteLayout(liveId: string, layoutId: string): Promise<void> {
  await apiClient.delete(`${base(liveId)}/${layoutId}`);
}

export async function copyLayoutFrom(liveId: string, sourceLiveId: string, sourceLayoutId: string): Promise<LayoutResponse> {
  const response = await apiClient.post<LayoutResponse>(`${base(liveId)}/copy-from`, { sourceLiveId, sourceLayoutId });
  if (!response) throw new Error('書式を取り込めませんでした');
  return response;
}

export async function fetchVenueAssets(liveId: string): Promise<VenueAsset[]> {
  return (await apiClient.get<{ assets: VenueAsset[] }>(`${base(liveId)}/assets`))?.assets ?? [];
}

export function uploadVenueAsset(liveId: string, file: File): Promise<VenueAsset> {
  return uploadFile<VenueAsset>(`${base(liveId)}/assets`, file);
}

/** 出力に使う書式。document を渡せばそれを、無ければ layoutId の保存済みの書式を、どちらも無ければフォームどおりの書式を使う。 */
export interface LayoutChoice {
  layoutId?: string | null;
  document?: VenueFormDocument;
}

export async function checkLayout(liveId: string, submissionId: string, choice: LayoutChoice): Promise<string[]> {
  const response = await apiClient.post<{ warnings: string[] }>(`${base(liveId)}/check`, { submissionId, ...choice });
  return response?.warnings ?? [];
}

export function fetchLayoutPdf(liveId: string, submissionId: string, choice: LayoutChoice): Promise<PdfFetchResult> {
  return postForBlob(`${base(liveId)}/submissions/${submissionId}/pdf`, choice);
}

export function fetchLayoutZip(liveId: string, submissionIds: string[], choice: LayoutChoice): Promise<PdfFetchResult> {
  return postForBlob(`${base(liveId)}/submissions/zip`, { submissionIds, ...choice });
}

export interface TableMeasurement {
  elementId: string;
  /** 見出しと全行を描くのに要る高さ。PDF と同じ文字幅で測った値。 */
  requiredHeightMm: number;
}

export async function measureGrids(liveId: string, submissionId: string, document: VenueFormDocument): Promise<TableMeasurement[]> {
  const response = await apiClient.post<{ tables: TableMeasurement[] }>(`${base(liveId)}/measure`, { submissionId, document });
  return response?.tables ?? [];
}

/** 背景ページのプレビュー画像のパス（認証付きで取得する）。quality は PDF の背景を何倍の解像度で描くか（1〜3）。 */
export function venuePagePreviewPath(liveId: string, assetId: string, pageIndex: number, quality = 1): string {
  const path = `${base(liveId)}/assets/${assetId}/pages/${pageIndex}`;
  return quality > 1 ? `${path}?quality=${quality}` : path;
}

export function venuePageLinesPath(liveId: string, assetId: string, pageIndex: number): string {
  return `${base(liveId)}/assets/${assetId}/pages/${pageIndex}/lines`;
}
