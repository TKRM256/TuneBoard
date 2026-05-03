package jp.tubeboard.features.lives.dto.request;

import java.util.Map;
import java.util.Set;

import jp.tubeboard.features.lives.pdf.PdfDensity;
import jp.tubeboard.features.lives.pdf.PdfHeaderOptions;
import jp.tubeboard.features.lives.pdf.PdfLayoutOptions;
import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;

/** Body of the single-submission PDF download endpoint. All fields optional. */
public record PdfGenerateRequest(
        PdfPaperSize paperSize,
        PdfOrientation orientation,
        Float baseFontSize,
        Float marginMm,
        Boolean includeItunesLinks,
        Boolean autoFitOnePage,
        PdfDensity density,
        PdfHeaderOptions header,
        Set<String> hiddenBlockIds,
        Map<String, String> blockLabelOverrides,
        /** When non-null, custom DSL takes precedence over the simple options above. */
        String customLayoutYaml) {

    public PdfLayoutOptions toLayoutOptions() {
        return new PdfLayoutOptions(paperSize, orientation, baseFontSize, marginMm,
                includeItunesLinks, autoFitOnePage, density, header, hiddenBlockIds, blockLabelOverrides);
    }
}
