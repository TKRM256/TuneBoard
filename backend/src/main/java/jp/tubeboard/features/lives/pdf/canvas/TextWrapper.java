package jp.tubeboard.features.lives.pdf.canvas;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import jp.tubeboard.features.lives.pdf.FontChain;

/**
 * Character-level line breaking shared by every canvas element. Japanese text
 * has no word separators, so lines are broken between characters rather than at
 * word boundaries.
 *
 * <p>Widths are accumulated one code point at a time. {@link FontChain#stringWidth}
 * is the sum of the individual glyph widths, so measuring incrementally gives the
 * same answer as re-measuring the whole prefix while staying linear in the length
 * of the text.
 */
public final class TextWrapper {

    private static final float LINE_HEIGHT_RATIO = 1.35f;

    private TextWrapper() {
    }

    public static float lineHeight(float fontSizePt) {
        return fontSizePt * LINE_HEIGHT_RATIO;
    }

    public static float measure(FontChain fontChain, String text, float fontSizePt) throws IOException {
        if (text == null || text.isEmpty()) {
            return 0f;
        }
        return fontChain.stringWidth(text, fontSizePt);
    }

    /** Wrap {@code text} (which may contain newlines) to fit within {@code maxWidth}. */
    public static List<String> wrap(FontChain fontChain, String text, float maxWidth, float fontSizePt)
            throws IOException {
        List<String> result = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return result;
        }
        for (String paragraph : text.split("\\R", -1)) {
            wrapParagraph(fontChain, paragraph, maxWidth, fontSizePt, result);
        }
        return result;
    }

    /**
     * Width of the widest paragraph at 1pt. Because glyph widths scale linearly
     * with the font size, {@code maxWidth / widestParagraphAtOnePt} is the largest
     * font size at which the text still fits on a single line.
     */
    public static float widestParagraphAtOnePt(FontChain fontChain, String text) throws IOException {
        if (text == null || text.isEmpty()) {
            return 0f;
        }
        float widest = 0f;
        for (String paragraph : text.split("\\R", -1)) {
            widest = Math.max(widest, fontChain.stringWidth(paragraph, 1f));
        }
        return widest;
    }

    private static void wrapParagraph(FontChain fontChain, String paragraph, float maxWidth,
            float fontSizePt, List<String> out) throws IOException {
        if (paragraph.isEmpty()) {
            out.add("");
            return;
        }
        StringBuilder current = new StringBuilder();
        float currentWidth = 0f;
        for (int i = 0; i < paragraph.length();) {
            int codePoint = paragraph.codePointAt(i);
            i += Character.charCount(codePoint);
            String glyph = new String(Character.toChars(codePoint));
            float glyphWidth = fontChain.stringWidth(glyph, fontSizePt);
            // An over-wide single character still has to go somewhere, so only
            // break when the line already holds something.
            if (current.length() > 0 && currentWidth + glyphWidth > maxWidth) {
                out.add(current.toString());
                current.setLength(0);
                currentWidth = 0f;
            }
            current.append(glyph);
            currentWidth += glyphWidth;
        }
        if (current.length() > 0) {
            out.add(current.toString());
        }
    }
}
