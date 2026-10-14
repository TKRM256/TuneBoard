/** マージ画面での値の表示整形 */
import { summarizeStagePlot } from '@/features/stage-plot/stage-plot-types';

export function formatValues(values: string[] | null) {
  if (values === null) {
    return 'なし';
  }
  // 配置図の値は JSON なので、置いたアイコンの名前に直して見せる（値の形から判定する）
  const text = values
    .filter((value) => value.trim())
    .map((value) => (value.startsWith('{"items"') ? summarizeStagePlot(value) || '配置図' : value))
    .join(' / ');
  return text || '(未入力)';
}
