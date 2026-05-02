package jp.tubeboard.features.lives.pdf;

import java.util.Map;
import java.util.Set;

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
        Boolean autoFitOnePage,
        PdfDensity density,
        PdfHeaderOptions header,
        /** Block IDs the user explicitly hid. Renderer skips them entirely. */
        Set<String> hiddenBlockIds,
        /** Optional renamed labels per block id (override displayed label). */
        Map<String, String> blockLabelOverrides) {

    public static PdfLayoutOptions defaults() {
        return new PdfLayoutOptions(null, null, null, null, null, null, null, null, null, null).withDefaults();
    }

    public PdfLayoutOptions withDefaults() {
        return new PdfLayoutOptions(
                paperSize != null ? paperSize : PdfPaperSize.A4,
                orientation != null ? orientation : PdfOrientation.LANDSCAPE,
                baseFontSize != null ? baseFontSize : 9f,
                marginMm != null ? marginMm : 10f,
                includeItunesLinks != null ? includeItunesLinks : true,
                autoFitOnePage != null ? autoFitOnePage : true,
                density != null ? density : PdfDensity.COMFORTABLE,
                header != null ? header.withDefaults() : PdfHeaderOptions.defaults(),
                hiddenBlockIds != null ? hiddenBlockIds : Set.of(),
                blockLabelOverrides != null ? blockLabelOverrides : Map.of());
    }

    public boolean isHidden(String blockId) {
        return hiddenBlockIds != null && hiddenBlockIds.contains(blockId);
    }

    public String labelFor(String blockId, String fallback) {
        if (blockLabelOverrides == null) return fallback;
        String overridden = blockLabelOverrides.get(blockId);
        return overridden != null && !overridden.isBlank() ? overridden : fallback;
    }
}
