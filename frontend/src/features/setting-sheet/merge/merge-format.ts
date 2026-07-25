/** マージ画面での値の表示整形 */

export function formatValues(values: string[] | null) {
  if (values === null) {
    return 'なし';
  }
  const text = values.filter((value) => value.trim()).join(' / ');
  return text || '(未入力)';
}
