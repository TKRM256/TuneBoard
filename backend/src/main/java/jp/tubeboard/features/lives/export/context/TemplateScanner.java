package jp.tubeboard.features.lives.export.context;

import java.util.ArrayList;
import java.util.List;

/**
 * 文字列の中の {@code ${...}} を取り出す。式の中の波かっこ（マップやラムダ）や、
 * 文字列リテラルの中の閉じかっこで途切れないよう、対応を数えながら読む。
 * 閉じていない {@code ${} はそのまま文字として扱う。
 */
final class TemplateScanner {

    /** 文字の部分か式の部分。式なら text は {@code ${ }} の中身。 */
    record Segment(String text, boolean expression) {
    }

    private TemplateScanner() {
    }

    static List<Segment> scan(String template) {
        List<Segment> segments = new ArrayList<>();
        StringBuilder literal = new StringBuilder();
        int i = 0;
        while (i < template.length()) {
            if (template.startsWith("${", i)) {
                int end = findClosingBrace(template, i + 2);
                if (end >= 0) {
                    if (!literal.isEmpty()) {
                        segments.add(new Segment(literal.toString(), false));
                        literal.setLength(0);
                    }
                    segments.add(new Segment(template.substring(i + 2, end), true));
                    i = end + 1;
                    continue;
                }
            }
            literal.append(template.charAt(i));
            i++;
        }
        if (!literal.isEmpty()) {
            segments.add(new Segment(literal.toString(), false));
        }
        return segments;
    }

    /** @return 対応する閉じかっこの位置。見つからなければ -1 */
    private static int findClosingBrace(String text, int from) {
        int depth = 1;
        char quote = 0;
        for (int i = from; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quote != 0) {
                if (c == '\\') {
                    i++;
                } else if (c == quote) {
                    quote = 0;
                }
                continue;
            }
            if (c == '\'' || c == '"') {
                quote = c;
            } else if (c == '{') {
                depth++;
            } else if (c == '}' && --depth == 0) {
                return i;
            }
        }
        return -1;
    }
}
