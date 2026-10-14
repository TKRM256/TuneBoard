package jp.tubeboard.features.lives.service;

/** iTunes の曲の長さ（ミリ秒）から、演奏時間の概算（分、切り上げ）を出す。フロントの itunes-duration.ts と同じ規則。 */
public final class ItunesDuration {

    /** これより長い値は壊れたデータとみなして保存しない。 */
    private static final long MAX_MILLIS = 24L * 60 * 60 * 1000;

    private ItunesDuration() {
    }

    /** 保存できる長さだけを残す。公開フォームから届く値なので、範囲外は捨てる。 */
    public static Long sanitizeMillis(Long millis) {
        return millis != null && millis > 0 && millis <= MAX_MILLIS ? millis : null;
    }

    /**
     * 分単位に切り上げる（3:01 → 4 分、3:00 → 3 分）。秒未満は iTunes の表示と同じく切り捨ててから切り上げる。
     * 長さが分からなければ null。
     */
    public static Integer approxMinutes(Long millis) {
        Long valid = sanitizeMillis(millis);
        if (valid == null) {
            return null;
        }
        long seconds = valid / 1000;
        return (int) ((seconds + 59) / 60);
    }
}
