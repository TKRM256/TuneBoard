package jp.tubeboard.features.lives.service;

import java.util.OptionalInt;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 演奏時間（DURATION ブロック）の値 {@code "分:秒"} の解釈と整形。フロントの duration.ts と同じ規則。 */
public final class DurationFormat {

    private static final Pattern PATTERN = Pattern.compile("^(\\d{1,3}):([0-5]\\d)$");

    private DurationFormat() {
    }

    public static boolean isValid(String value) {
        return value != null && PATTERN.matcher(value.trim()).matches();
    }

    public static OptionalInt parseSeconds(String value) {
        if (value == null) {
            return OptionalInt.empty();
        }
        Matcher matcher = PATTERN.matcher(value.trim());
        if (!matcher.matches()) {
            return OptionalInt.empty();
        }
        return OptionalInt.of(Integer.parseInt(matcher.group(1)) * 60 + Integer.parseInt(matcher.group(2)));
    }

    public static String format(long totalSeconds) {
        long seconds = Math.max(0, totalSeconds);
        return (seconds / 60) + ":" + String.format("%02d", seconds % 60);
    }
}
