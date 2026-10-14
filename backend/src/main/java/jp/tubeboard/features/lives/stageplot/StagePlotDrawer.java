package jp.tubeboard.features.lives.stageplot;

import java.awt.Color;
import java.io.IOException;

import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasColors;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.pdf.draw.TextBoxDrawer;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings.PaletteItem;
import jp.tubeboard.features.lives.stageplot.StagePlotValue.PlotItem;
import jp.tubeboard.features.lives.stageplot.icon.IconNodeDrawer;

/**
 * 配置図を PDF の枠に描く。
 * 「アイコンだけ」は枠そのものをステージとみなし（会場書式に印刷された図に重ねる）、
 * 「下絵ごと」は枠の中に下絵を縦横比を保って置き、その上にアイコンを描く。
 */
public final class StagePlotDrawer {

    private static final float ICON_STROKE_WIDTH = 2f;
    private static final float DEFAULT_LABEL_FONT_SIZE = 7f;
    private static final Color STAGE_BORDER = new Color(0x9c, 0xa3, 0xaf);

    private StagePlotDrawer() {
    }

    public static void draw(PDPageContentStream stream, FontChain fontChain, PdfBox box, StagePlotSettings settings,
            StagePlotValue value, boolean withBase, PDImageXObject baseImage, Float labelFontSizePt)
            throws IOException {
        PdfBox stage = box;
        if (withBase) {
            double aspect = baseImage != null
                    ? (double) baseImage.getWidth() / baseImage.getHeight()
                    : settings.effectiveAspectRatio();
            stage = contain(box, aspect);
            if (baseImage != null) {
                stream.drawImage(baseImage, stage.leftX(), stage.bottomY(), stage.widthPt(), stage.heightPt());
            } else {
                TextBoxDrawer.strokeRect(stream, stage, STAGE_BORDER, 0.6f);
            }
        }

        float iconSize = (float) (settings.effectiveIconScale() * stage.widthPt());
        float fontSize = labelFontSizePt != null && labelFontSizePt > 0 ? labelFontSizePt : DEFAULT_LABEL_FONT_SIZE;
        for (PlotItem item : value.itemsOrEmpty()) {
            if (item == null || item.x() == null || item.y() == null) {
                continue;
            }
            PaletteItem palette = settings.findPalette(item.paletteId()).orElse(null);
            if (palette == null) {
                continue;
            }
            float centerX = stage.leftX() + (float) (clamp01(item.x()) * stage.widthPt());
            float centerY = stage.topY() - (float) (clamp01(item.y()) * stage.heightPt());
            Color color = CanvasColors.parse(palette.color(), Color.BLACK);
            PdfBox iconBox = new PdfBox(centerX - iconSize / 2f, centerY - iconSize / 2f, centerY + iconSize / 2f,
                    iconSize, iconSize);
            IconNodeDrawer.draw(stream, palette.nodes(), iconBox, color, ICON_STROKE_WIDTH);

            String label = StagePlotValues.resolveLabel(item, settings);
            if (!label.isBlank()) {
                float labelWidth = Math.max(iconSize * 2.5f, fontSize * 8f);
                float labelHeight = fontSize * 2.6f;
                float labelTop = iconBox.bottomY() - 0.5f;
                PdfBox labelBox = new PdfBox(centerX - labelWidth / 2f, labelTop - labelHeight, labelTop,
                        labelWidth, labelHeight);
                TextBoxDrawer.drawTextBox(stream, fontChain, label, labelBox, fontSize, "center", "top", color,
                        false);
            }
        }
    }

    /** 枠の中に、指定の縦横比で収まる最大の矩形（中央寄せ）。 */
    static PdfBox contain(PdfBox box, double aspect) {
        float width = box.widthPt();
        float height = (float) (width / aspect);
        if (height > box.heightPt()) {
            height = box.heightPt();
            width = (float) (height * aspect);
        }
        float left = box.leftX() + (box.widthPt() - width) / 2f;
        float top = box.topY() - (box.heightPt() - height) / 2f;
        return new PdfBox(left, top - height, top, width, height);
    }

    private static double clamp01(double v) {
        return Math.max(0, Math.min(1, v));
    }
}
