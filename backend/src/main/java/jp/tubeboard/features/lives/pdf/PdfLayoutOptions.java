package jp.tubeboard.features.lives.pdf;

/**
 * Layout configuration for setting sheet PDFs. Any null/missing value falls back
 * to a sensible default in {@link #withDefaults()}.
 */
public record PdfLayoutOptions(
        PdfPaperSize paperSize,
        PdfOrientation orientation,
        Float baseFontSize,
        Float marginMm,
        Boolean includeItunesLinks,
        Boolean autoFitOnePage) {

    public static PdfLayoutOptions defaults() {
        return new PdfLayoutOptions(null, null, null, null, null, null).withDefaults();
    }

    public PdfLayoutOptions withDefaults() {
        return new PdfLayoutOptions(
                paperSize != null ? paperSize : PdfPaperSize.A4,
                orientation != null ? orientation : PdfOrientation.LANDSCAPE,
                baseFontSize != null ? baseFontSize : 9f,
                marginMm != null ? marginMm : 10f,
                includeItunesLinks != null ? includeItunesLinks : true,
                autoFitOnePage != null ? autoFitOnePage : true);
    }
}
