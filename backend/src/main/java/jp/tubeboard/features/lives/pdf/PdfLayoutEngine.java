package jp.tubeboard.features.lives.pdf;

import java.awt.Color;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

/**
 * Low-level PDF drawing primitives shared by the renderer. Tracks a single
 * cursor (top-down) and exposes helpers for text wrapping and basic shapes.
 */
public class PdfLayoutEngine implements AutoCloseable {

    public static final Color COLOR_TEXT = new Color(0x1f, 0x29, 0x37);
    public static final Color COLOR_TEXT_MUTED = new Color(0x6b, 0x72, 0x80);
    public static final Color COLOR_BORDER = new Color(0xd1, 0xd5, 0xdb);
    public static final Color COLOR_BORDER_STRONG = new Color(0x6b, 0x72, 0x80);
    public static final Color COLOR_BG_SUBTLE = new Color(0xf3, 0xf4, 0xf6);
    public static final Color COLOR_BG_HEADER = new Color(0xe5, 0xed, 0xf6);
    public static final Color COLOR_WHITE = Color.WHITE;
    public static final float MM_TO_PT = 2.834645f;

    private final PDDocument document;
    private final PDType0Font font;
    private final PDRectangle pageBox;
    private final float marginPt;
    private final float baseFontSize;

    private PDPage currentPage;
    private PDPageContentStream stream;
    private float cursorY;
    private int pageCount;

    public PdfLayoutEngine(PDDocument document, PDType0Font font, PDRectangle pageBox,
            float marginPt, float baseFontSize) {
        this.document = document;
        this.font = font;
        this.pageBox = pageBox;
        this.marginPt = marginPt;
        this.baseFontSize = baseFontSize;
    }

    public PDType0Font font() {
        return font;
    }

    public float baseFontSize() {
        return baseFontSize;
    }

    public float labelFontSize() {
        return Math.max(6.5f, baseFontSize * 0.78f);
    }

    public float titleFontSize() {
        return baseFontSize * 1.55f;
    }

    public float headingFontSize() {
        return baseFontSize * 1.15f;
    }

    public float lineHeight(float fontSize) {
        return fontSize * 1.35f;
    }

    public float marginPt() {
        return marginPt;
    }

    public float contentLeft() {
        return marginPt;
    }

    public float contentRight() {
        return pageBox.getWidth() - marginPt;
    }

    public float contentTop() {
        return pageBox.getHeight() - marginPt;
    }

    public float contentBottom() {
        return marginPt;
    }

    public float contentWidth() {
        return contentRight() - contentLeft();
    }

    public float cursorY() {
        return cursorY;
    }

    public void setCursorY(float y) {
        this.cursorY = y;
    }

    public int pageCount() {
        return pageCount;
    }

    public void newPage() throws IOException {
        if (stream != null) {
            stream.close();
        }
        currentPage = new PDPage(pageBox);
        document.addPage(currentPage);
        stream = new PDPageContentStream(document, currentPage);
        cursorY = contentTop();
        pageCount++;
    }

    public void ensureSpace(float requiredHeight) throws IOException {
        if (cursorY - requiredHeight < contentBottom()) {
            newPage();
        }
    }

    public float measureTextWidth(String text, float fontSize) throws IOException {
        if (text == null || text.isEmpty()) {
            return 0f;
        }
        return font.getStringWidth(text) / 1000f * fontSize;
    }

    /** Wrap a single logical line to fit within the given width. */
    public List<String> wrap(String text, float maxWidth, float fontSize) throws IOException {
        List<String> result = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return result;
        }
        for (String paragraph : text.split("\\R", -1)) {
            wrapParagraph(paragraph, maxWidth, fontSize, result);
        }
        return result;
    }

    private void wrapParagraph(String paragraph, float maxWidth, float fontSize, List<String> out) throws IOException {
        if (paragraph.isEmpty()) {
            out.add("");
            return;
        }
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < paragraph.length(); i++) {
            char ch = paragraph.charAt(i);
            current.append(ch);
            float width = measureTextWidth(current.toString(), fontSize);
            if (width > maxWidth) {
                if (current.length() == 1) {
                    out.add(current.toString());
                    current.setLength(0);
                } else {
                    current.deleteCharAt(current.length() - 1);
                    out.add(current.toString());
                    current.setLength(0);
                    current.append(ch);
                }
            }
        }
        if (current.length() > 0) {
            out.add(current.toString());
        }
    }

    public void drawText(String text, float x, float y, float fontSize, Color color) throws IOException {
        if (text == null || text.isEmpty()) {
            return;
        }
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.setNonStrokingColor(color);
        stream.newLineAtOffset(x, y);
        stream.showText(text);
        stream.endText();
    }

    /** Draw wrapped lines starting from {@code topY}. Returns the y position after the last line. */
    public float drawLines(List<String> lines, float x, float topY, float fontSize, Color color) throws IOException {
        float lh = lineHeight(fontSize);
        float y = topY - fontSize;
        for (String line : lines) {
            drawText(line, x, y, fontSize, color);
            y -= lh;
        }
        return y + lh - fontSize;
    }

    public void drawFilledRect(float x, float y, float width, float height, Color fill) throws IOException {
        stream.setNonStrokingColor(fill);
        stream.addRect(x, y, width, height);
        stream.fill();
    }

    public void drawStrokedRect(float x, float y, float width, float height, Color stroke,
            float lineWidth) throws IOException {
        stream.setStrokingColor(stroke);
        stream.setLineWidth(lineWidth);
        stream.addRect(x, y, width, height);
        stream.stroke();
    }

    public void drawHorizontalLine(float x1, float x2, float y, Color color, float lineWidth) throws IOException {
        drawLine(x1, y, x2, y, color, lineWidth);
    }

    public void drawVerticalLine(float x, float y1, float y2, Color color, float lineWidth) throws IOException {
        drawLine(x, y1, x, y2, color, lineWidth);
    }

    public void drawLine(float x1, float y1, float x2, float y2, Color color, float lineWidth) throws IOException {
        stream.setStrokingColor(color);
        stream.setLineWidth(lineWidth);
        stream.moveTo(x1, y1);
        stream.lineTo(x2, y2);
        stream.stroke();
    }

    @Override
    public void close() throws IOException {
        if (stream != null) {
            stream.close();
            stream = null;
        }
    }
}
