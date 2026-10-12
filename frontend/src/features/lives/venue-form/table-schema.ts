/** 表の列と、表に書く内容の形。バックエンドの CanvasSchema（TableColumn / TableSource）と同じ形にする。 */

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export type TableSource =
  | { kind: 'group'; groupId: string; fallbackLabel?: string }
  | { kind: 'fields'; fields: Array<{ fieldId: string; fallbackLabel?: string }> };

export interface TableColumn {
  id: string;
  header: string;
  /** フォームの項目 ID。`__index__` は番号（グループの行）、`__label__` は項目名（項目を並べた行）。 */
  fieldId: string;
  widthRatio: number;
  align?: HAlign;
  format?: string;
  /** 列の幅に入らない文字を、折り返す代わりに小さくする。 */
  shrinkToFit?: boolean;
  /** 上の縮小の下限。既定 6pt。ここまで縮めても入らない分は折り返す。 */
  minFontSizePt?: number;
}

export const DEFAULT_MIN_FONT_SIZE_PT = 6;
