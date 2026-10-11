package jp.tubeboard.features.lives.venueform.render;

import java.awt.Color;
import java.io.IOException;
import java.util.Map;
import java.util.function.Consumer;

import org.apache.pdfbox.pdmodel.PDPageContentStream;

import jp.tubeboard.features.lives.export.context.CanvasContext;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasColors;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.pdf.draw.TextBoxDrawer;
import jp.tubeboard.features.lives.stageplot.icon.IconNodeDrawer;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;

/** テキスト・項目・アイコン・図形の要素を描く。表と配置図は専用のクラスに任せる。 */
final class VenueElementDrawer {

    private static final float DEFAULT_FONT_SIZE = 10f;
    private static final float KAPPA = 0.5522848f;
    private static final Color DEFAULT_COLOR = new Color(0x11, 0x18, 0x27);

    private final ExpressionEvaluator evaluator;

    VenueElementDrawer(ExpressionEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    /** 式の評価に失敗した部分は紙面に出さず、onError へ知らせる。 */
    void drawText(PDPageContentStream stream, FontChain fontChain, VenueElement.TextElement t, PdfBox box,
            Map<String, Object> namespace, Consumer<String> onError) throws IOException {
        String content = evaluator.interpolate(t.content() == null ? "" : t.content(), namespace, onError);
        TextBoxDrawer.drawTextBox(stream, fontChain, content, box, fontSize(t.fontSizePt()), t.align(),
                t.verticalAlign(), color(t.color()), Boolean.TRUE.equals(t.bold()));
    }

    /** @return 項目が見つかったか */
    boolean drawField(PDPageContentStream stream, FontChain fontChain, VenueElement.FieldElement f, PdfBox box,
            Map<String, Object> namespace) throws IOException {
        if (!(namespace.get("fields") instanceof Map<?, ?> fields)
                || !(fields.get(f.fieldId()) instanceof CanvasContext.FieldRef ref)) {
            return false;
        }
        TextBoxDrawer.drawTextBox(stream, fontChain, ref.getValue(), box, fontSize(f.fontSizePt()), f.align(),
                f.verticalAlign(), color(f.color()), Boolean.TRUE.equals(f.bold()));
        return true;
    }

    void drawIcon(PDPageContentStream stream, VenueElement.IconElement icon, PdfBox box) throws IOException {
        float strokeWidth = icon.strokeWidth() != null && icon.strokeWidth() > 0 ? icon.strokeWidth() : 2f;
        IconNodeDrawer.draw(stream, icon.nodes(), box, color(icon.color()), strokeWidth);
    }

    void drawShape(PDPageContentStream stream, VenueElement.ShapeElement shape, PdfBox box) throws IOException {
        Color stroke = color(shape.strokeColor());
        Color fill = shape.fillColor() == null || shape.fillColor().isBlank() ? null
                : CanvasColors.parse(shape.fillColor(), null);
        float width = shape.strokeWidthPt() != null && shape.strokeWidthPt() >= 0 ? shape.strokeWidthPt() : 1f;
        stream.saveGraphicsState();
        stream.setStrokingColor(stroke);
        stream.setLineWidth(width);
        switch (shape.shape()) {
            case "line" -> {
                stream.moveTo(box.leftX(), box.centerY());
                stream.lineTo(box.leftX() + box.widthPt(), box.centerY());
                stream.stroke();
            }
            case "rect" -> {
                stream.addRect(box.leftX(), box.bottomY(), box.widthPt(), box.heightPt());
                finish(stream, fill, width);
            }
            default -> {
                ellipse(stream, box);
                finish(stream, fill, width);
            }
        }
        stream.restoreGraphicsState();
    }

    private static void finish(PDPageContentStream stream, Color fill, float strokeWidth) throws IOException {
        if (fill != null) {
            stream.setNonStrokingColor(fill);
        }
        if (fill != null && strokeWidth > 0) {
            stream.fillAndStroke();
        } else if (fill != null) {
            stream.fill();
        } else {
            stream.stroke();
        }
    }

    private static void ellipse(PDPageContentStream s, PdfBox box) throws IOException {
        float cx = box.centerX();
        float cy = box.centerY();
        float rx = box.widthPt() / 2f;
        float ry = box.heightPt() / 2f;
        float kx = rx * KAPPA;
        float ky = ry * KAPPA;
        s.moveTo(cx + rx, cy);
        s.curveTo(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry);
        s.curveTo(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy);
        s.curveTo(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry);
        s.curveTo(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy);
        s.closePath();
    }

    static Color color(String hex) {
        return CanvasColors.parse(hex, DEFAULT_COLOR);
    }

    private static float fontSize(Float value) {
        return value != null && value > 0 ? value : DEFAULT_FONT_SIZE;
    }
}
