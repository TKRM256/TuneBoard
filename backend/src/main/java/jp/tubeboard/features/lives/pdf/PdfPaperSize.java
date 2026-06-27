package jp.tubeboard.features.lives.pdf;

import org.apache.pdfbox.pdmodel.common.PDRectangle;

/**
 * Supported paper sizes. Dimensions are stored in millimeters and converted to
 * PDFBox points lazily so we can offer JIS B4/B5 (which PDFBox does not ship as
 * constants).
 */
public enum PdfPaperSize {
    A3(297f, 420f),
    A4(210f, 297f),
    A5(148f, 210f),
    B4(257f, 364f),
    B5(182f, 257f),
    LETTER(216f, 279f);

    private static final float MM_TO_PT = 2.834645f;

    private final float widthMm;
    private final float heightMm;

    PdfPaperSize(float widthMm, float heightMm) {
        this.widthMm = widthMm;
        this.heightMm = heightMm;
    }

    public float widthMm() {
        return widthMm;
    }

    public float heightMm() {
        return heightMm;
    }

    public PDRectangle rectangle(PdfOrientation orientation) {
        if (orientation == PdfOrientation.LANDSCAPE) {
            return new PDRectangle(heightMm * MM_TO_PT, widthMm * MM_TO_PT);
        }
        return new PDRectangle(widthMm * MM_TO_PT, heightMm * MM_TO_PT);
    }
}
