package jp.tubeboard.features.lives.pdf.draw;

/**
 * PDFBox の座標（左下原点・pt）での矩形。画面側の mm 座標（左上原点）から作る。
 */
public record PdfBox(float leftX, float bottomY, float topY, float widthPt, float heightPt) {

    public static final float PT_PER_MM = 72f / 25.4f;

    public static PdfBox fromTopLeftMm(float xMm, float yMm, float wMm, float hMm, float pageHeightPt) {
        float left = xMm * PT_PER_MM;
        float top = pageHeightPt - yMm * PT_PER_MM;
        float width = wMm * PT_PER_MM;
        float height = hMm * PT_PER_MM;
        return new PdfBox(left, top - height, top, width, height);
    }

    public static PdfBox fromTopLeftPt(float leftPt, float topPt, float widthPt, float heightPt,
            float pageHeightPt) {
        float top = pageHeightPt - topPt;
        return new PdfBox(leftPt, top - heightPt, top, widthPt, heightPt);
    }

    public float centerX() {
        return leftX + widthPt / 2f;
    }

    public float centerY() {
        return bottomY + heightPt / 2f;
    }
}
