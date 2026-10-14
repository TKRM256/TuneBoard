/** ステージ配置図の型と、回答（JSON 文字列）の読み書き。バックエンドの StagePlotSettings / StagePlotValue と同じ形。 */

/** lucide のアイコンを構成する SVG 要素 1 つ（24×24 の viewBox 上の座標）。 */
export type IconNode = [tag: string, attrs: Record<string, string>];

export interface PaletteItem {
  id: string;
  iconName: string;
  label: string;
  color: string;
  nodes: IconNode[];
}

export interface StagePlotSettings {
  baseAssetId: string | null;
  /** 下絵が無いときのステージの縦横比（幅 / 高さ） */
  aspectRatio: number | null;
  /** アイコンの大きさ（ステージの幅に対する比率） */
  iconScale: number | null;
  palette: PaletteItem[];
}

/** 出演者の公開フォーム向け。下絵は公開用の URL から取る。 */
export interface PublicStagePlot {
  hasBase: boolean;
  aspectRatio: number;
  iconScale: number;
  palette: PaletteItem[];
}

export interface PlotItem {
  id: string;
  paletteId: string;
  label: string;
  /** 下絵に対するアイコン中心の位置（0〜1） */
  x: number;
  y: number;
}

export interface StagePlotValue {
  items: PlotItem[];
}

export const DEFAULT_ASPECT_RATIO = 1.6;
export const DEFAULT_ICON_SCALE = 0.08;
/** バックエンドの StagePlotValues と同じ上限。 */
export const MAX_PLOT_ITEMS = 50;
export const MAX_PLOT_LABEL_LENGTH = 50;

export function parseStagePlotValue(raw: string | undefined | null): StagePlotValue {
  if (!raw) return { items: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StagePlotValue> | null;
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return {
      items: items
        .filter((item): item is PlotItem => Boolean(item) && typeof item === 'object'
          && typeof item.x === 'number' && typeof item.y === 'number' && typeof item.paletteId === 'string')
        .map((item) => ({
          id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
          paletteId: item.paletteId,
          label: typeof item.label === 'string' ? item.label : '',
          x: clamp01(item.x),
          y: clamp01(item.y),
        })),
    };
  } catch {
    return { items: [] };
  }
}

/** 何も置いていなければ空文字（＝未入力）にする。 */
export function serializeStagePlotValue(value: StagePlotValue): string {
  return value.items.length === 0 ? '' : JSON.stringify({ items: value.items });
}

/** 一覧や詳細に出す要約。置いたアイコンのラベルを並べる。 */
export function summarizeStagePlot(raw: string | undefined | null): string {
  const labels = parseStagePlotValue(raw).items.map((item) => item.label.trim()).filter(Boolean);
  return labels.length === 0 ? '' : `配置図: ${labels.join(' / ')}`;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
