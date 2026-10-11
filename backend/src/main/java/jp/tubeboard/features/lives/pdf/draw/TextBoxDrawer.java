package jp.tubeboard.features.lives.pdf.draw;

import java.awt.Color;
import java.io.IOException;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDPageContentStream;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasColors;
import jp.tubeboard.features.lives.pdf.canvas.TextWrapper;

/** 枠の中に文字を折り返して描く。背景・枠線の塗りもここにまとめる。 */
public final class TextBoxDrawer {

    private TextBoxDrawer() {
    }

    public static void drawTextBox(PDPageContentStream stream, FontChain fontChain, String text, PdfBox box,
            float fs, String align, String verticalAlign, Color color, boolean bold) throws IOException {
        if (text == null || text.isEmpty())
            return;
        List<String> lines = TextWrapper.wrap(fontChain, text, box.widthPt() - 2f, fs);
        float lh = TextWrapper.lineHeight(fs);
        float totalHeight = lines.size() * lh;
        float topOffset;
        if ("middle".equalsIgnoreCase(verticalAlign) || "center".equalsIgnoreCase(verticalAlign)) {
            topOffset = (box.heightPt() - totalHeight) / 2f;
        } else if ("bottom".equalsIgnoreCase(verticalAlign)) {
            topOffset = box.heightPt() - totalHeight;
        } else {
            topOffset = 0f;
        }
        float y = box.topY() - topOffset - fs;
        for (String line : lines) {
            float lineWidth = TextWrapper.measure(fontChain, line, fs);
            float x;
            if ("center".equalsIgnoreCase(align)) {
                x = box.leftX() + (box.widthPt() - lineWidth) / 2f;
            } else if ("right".equalsIgnoreCase(align)) {
                x = box.leftX() + box.widthPt() - lineWidth - 1f;
            } else {
                x = box.leftX() + 1f;
            }
            stream.beginText();
            stream.setNonStrokingColor(color);
            stream.newLineAtOffset(x, y);
            fontChain.showText(stream, line, fs);
            stream.endText();
            y -= lh;
            if (bold) {
                // Rough bold emulation: redraw with a small offset.
                stream.beginText();
                stream.setNonStrokingColor(color);
                stream.newLineAtOffset(x + 0.3f, y + lh);
                fontChain.showText(stream, line, fs);
                stream.endText();
            }
        }
    }

    public static void drawBackgroundAndBorder(PDPageContentStream stream, PdfBox box, String bgHex,
            String borderHex, Float borderThickness) throws IOException {
        if (!isBlank(bgHex)) {
            Color bg = CanvasColors.parse(bgHex, null);
            if (bg != null)
                fillRect(stream, box, bg);
        }
        if (!isBlank(borderHex) && (borderThickness == null || borderThickness > 0)) {
            Color bc = CanvasColors.parse(borderHex, null);
            if (bc != null)
                strokeRect(stream, box, bc, borderThickness != null ? borderThickness : 0.5f);
        }
    }

    public static void fillRect(PDPageContentStream stream, PdfBox box, Color color) throws IOException {
        stream.setNonStrokingColor(color);
        stream.addRect(box.leftX(), box.bottomY(), box.widthPt(), box.heightPt());
        stream.fill();
    }

    public static void strokeRect(PDPageContentStream stream, PdfBox box, Color color, float lineWidth)
            throws IOException {
        stream.setStrokingColor(color);
        stream.setLineWidth(lineWidth);
        stream.addRect(box.leftX(), box.bottomY(), box.widthPt(), box.heightPt());
        stream.stroke();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
