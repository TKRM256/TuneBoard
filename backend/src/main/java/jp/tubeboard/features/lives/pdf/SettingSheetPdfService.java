package jp.tubeboard.features.lives.pdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Service;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import lombok.RequiredArgsConstructor;

/**
 * Builds a PDF byte array for a single submission. Pure function over the
 * provided DTOs; no DB access here, keeping the renderer testable in isolation.
 */
@Service
@RequiredArgsConstructor
public class SettingSheetPdfService {

    private static final float MIN_AUTOFIT_FONT_SIZE = 7f;
    private static final float AUTOFIT_FONT_STEP = 0.5f;

    private final PdfFontLoader fontLoader;

    public byte[] generate(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions rawOptions) throws IOException {
        PdfLayoutOptions options = rawOptions == null ? PdfLayoutOptions.defaults() : rawOptions.withDefaults();

        if (Boolean.TRUE.equals(options.autoFitOnePage())) {
            byte[] fitted = renderWithAutoFit(live, config, submission, options);
            if (fitted != null) {
                return fitted;
            }
        }
        return renderOnce(live, config, submission, options);
    }

    private byte[] renderWithAutoFit(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions options) throws IOException {
        float fontSize = options.baseFontSize();
        while (fontSize >= MIN_AUTOFIT_FONT_SIZE) {
            PdfLayoutOptions attempt = new PdfLayoutOptions(options.paperSize(), options.orientation(),
                    fontSize, options.marginMm(), options.includeItunesLinks(), options.autoFitOnePage());
            try (PDDocument document = new PDDocument()) {
                PDType0Font font = fontLoader.load(document);
                PDRectangle pageBox = options.paperSize().rectangle(options.orientation());
                float marginPt = options.marginMm() * PdfLayoutEngine.MM_TO_PT;
                try (PdfLayoutEngine engine = new PdfLayoutEngine(document, font, pageBox, marginPt, fontSize)) {
                    SubmissionPdfRenderer renderer = new SubmissionPdfRenderer(engine,
                            Boolean.TRUE.equals(options.includeItunesLinks()));
                    renderer.render(live, config, submission);
                    if (engine.pageCount() == 1) {
                        engine.close();
                        return toBytes(document);
                    }
                }
            }
            fontSize -= AUTOFIT_FONT_STEP;
        }
        return null;
    }

    private byte[] renderOnce(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions options) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDType0Font font = fontLoader.load(document);
            PDRectangle pageBox = options.paperSize().rectangle(options.orientation());
            float marginPt = options.marginMm() * PdfLayoutEngine.MM_TO_PT;
            try (PdfLayoutEngine engine = new PdfLayoutEngine(document, font, pageBox, marginPt,
                    options.baseFontSize())) {
                SubmissionPdfRenderer renderer = new SubmissionPdfRenderer(engine,
                        Boolean.TRUE.equals(options.includeItunesLinks()));
                renderer.render(live, config, submission);
            }
            return toBytes(document);
        }
    }

    private byte[] toBytes(PDDocument document) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            document.save(baos);
            return baos.toByteArray();
        }
    }
}
