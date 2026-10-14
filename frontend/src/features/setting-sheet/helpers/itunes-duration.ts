/** iTunes の曲の長さ（ミリ秒）から演奏時間の概算（分、切り上げ）を出す。バックエンドの ItunesDuration と同じ規則。 */
export function approxMinutes(durationMs: number | null | undefined): number | null {
  if (durationMs == null || durationMs <= 0) return null;
  // 秒未満は iTunes の表示に合わせて切り捨ててから、分に切り上げる（3:01 → 4 分）
  const seconds = Math.floor(durationMs / 1000);
  return Math.ceil(seconds / 60);
}
