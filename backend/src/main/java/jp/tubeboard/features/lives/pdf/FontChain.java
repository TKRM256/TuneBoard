package jp.tubeboard.features.lives.pdf;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

/**
 * An ordered chain of embedded fonts for a single {@link org.apache.pdfbox.pdmodel.PDDocument}.
 * The primary font (index 0) is tried for every character; later fonts only
 * cover scripts the primary font lacks (e.g. Hangul, Cyrillic). Characters no
 * font in the chain can render (including invisible Unicode format/control
 * characters such as U+202A that no font maps to a real glyph) are dropped
 * instead of aborting the whole PDF.
 */
public final class FontChain {

    private final List<PDType0Font> fonts;
    private final Map<Integer, PDType0Font> resolutionCache = new HashMap<>();

    public FontChain(List<PDType0Font> fonts) {
        if (fonts == null || fonts.isEmpty()) {
            throw new IllegalArgumentException("FontChain requires at least one font");
        }
        this.fonts = fonts;
    }

    public PDType0Font primary() {
        return fonts.get(0);
    }

    public float stringWidth(String text, float fontSize) throws IOException {
        float total = 0f;
        for (Run run : splitIntoRuns(text)) {
            total += run.font().getStringWidth(run.text()) / 1000f * fontSize;
        }
        return total;
    }

    public void showText(PDPageContentStream stream, String text, float fontSize) throws IOException {
        for (Run run : splitIntoRuns(text)) {
            stream.setFont(run.font(), fontSize);
            stream.showText(run.text());
        }
    }

    /** Splits text into runs sharing the same resolved font; unsupported characters are dropped. */
    private List<Run> splitIntoRuns(String text) {
        List<Run> runs = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return runs;
        }
        StringBuilder buffer = new StringBuilder();
        PDType0Font currentFont = null;
        for (int i = 0; i < text.length();) {
            int codePoint = text.codePointAt(i);
            i += Character.charCount(codePoint);
            String glyph = new String(Character.toChars(codePoint));
            PDType0Font resolved = resolveFont(codePoint, glyph);
            if (resolved == null) {
                continue;
            }
            if (resolved != currentFont) {
                flush(runs, buffer, currentFont);
                currentFont = resolved;
            }
            buffer.append(glyph);
        }
        flush(runs, buffer, currentFont);
        return runs;
    }

    private static void flush(List<Run> runs, StringBuilder buffer, PDType0Font font) {
        if (font != null && buffer.length() > 0) {
            runs.add(new Run(buffer.toString(), font));
        }
        buffer.setLength(0);
    }

    private PDType0Font resolveFont(int codePoint, String glyph) {
        if (resolutionCache.containsKey(codePoint)) {
            return resolutionCache.get(codePoint);
        }
        for (PDType0Font font : fonts) {
            try {
                font.encode(glyph);
                resolutionCache.put(codePoint, font);
                return font;
            } catch (IllegalArgumentException | IOException ignored) {
                // this font has no glyph for the codepoint; try the next one in the chain
            }
        }
        resolutionCache.put(codePoint, null);
        return null;
    }

    private record Run(String text, PDType0Font font) {
    }
}
