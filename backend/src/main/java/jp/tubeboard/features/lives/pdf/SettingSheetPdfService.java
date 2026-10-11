package jp.tubeboard.features.lives.pdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.canvas.CanvasRenderer;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.DefaultCanvasFactory;
import lombok.RequiredArgsConstructor;

/**
 * Builds setting-sheet PDFs from a {@link CanvasDocument}. If no canvas is
 * supplied a sensible default is generated from the form configuration.
 */
@Service
@RequiredArgsConstructor
public class SettingSheetPdfService {

    private final PdfFontLoader fontLoader;
    private final ExpressionEvaluator evaluator;
    private final DefaultCanvasFactory defaultCanvasFactory;

    public byte[] generate(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, CanvasDocument canvas) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            write(live, config, submission, canvas, baos);
            return baos.toByteArray();
        }
    }

    public void write(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, CanvasDocument canvas,
            OutputStream out) throws IOException {
        CanvasDocument doc = canvas != null && canvas.elements() != null
                ? canvas
                : defaultCanvasFactory.build(config);
        try (PDDocument pdf = new PDDocument()) {
            FontChain fontChain = fontLoader.loadFontChain(pdf);
            new CanvasRenderer(evaluator, live, config, submission).render(doc, pdf, fontChain);
            pdf.save(out);
        }
    }
}
