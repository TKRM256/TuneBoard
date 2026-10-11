/** 演奏時間（DURATION ブロック）の値 "分:秒"。バックエンドの DurationFormat と同じ規則。 */

const DURATION_PATTERN = /^(\d{1,3}):([0-5]\d)$/;

export function isValidDuration(value: string): boolean {
  return DURATION_PATTERN.test(value.trim());
}

/** 分・秒の入力欄の値から "分:秒" を作る。どちらも空なら空文字（未入力）。 */
export function composeDuration(minutes: string, seconds: string): string {
  const m = minutes.trim();
  const s = seconds.trim();
  if (!m && !s) return '';
  const minuteNumber = m === '' ? 0 : Number(m);
  const secondNumber = s === '' ? 0 : Number(s);
  if (!Number.isInteger(minuteNumber) || !Number.isInteger(secondNumber) || minuteNumber < 0 || secondNumber < 0) {
    // 数字でない入力はそのまま残し、検証でエラーにする
    return `${m}:${s}`;
  }
  return `${minuteNumber}:${String(secondNumber).padStart(2, '0')}`;
}

/** "分:秒" を入力欄の値に分ける。読めない値は分の欄にそのまま出す。 */
export function splitDuration(value: string): { minutes: string; seconds: string } {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) {
    const [minutes = '', seconds = ''] = value.split(':');
    return { minutes, seconds };
  }
  return { minutes: match[1], seconds: match[2] };
}
