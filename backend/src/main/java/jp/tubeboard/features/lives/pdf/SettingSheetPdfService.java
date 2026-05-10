package jp.tubeboard.features.lives.pdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Service;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasRenderer;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.DefaultCanvasFactory;
import jp.tubeboard.features.lives.pdf.canvas.ExpressionEvaluator;
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
            writePdfToStream(live, config, submission, canvas, baos);
            return baos.toByteArray();
        }
    }

    private void writePdfToStream(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, CanvasDocument canvas,
            OutputStream out) throws IOException {
        CanvasDocument doc = canvas != null && canvas.elements() != null
                ? canvas
                : defaultCanvasFactory.build(config);
        try (PDDocument pdf = new PDDocument()) {
            PDType0Font font = fontLoader.load(pdf);
            new CanvasRenderer(evaluator, live, config, submission).render(doc, pdf, font);
            pdf.save(out);
        }
    }

    /** Build a zip archive containing one PDF per provided submission. */
    public byte[] generateZip(List<SubmissionInputs> inputs, CanvasDocument canvas) throws IOException {
        Set<String> usedNames = new HashSet<>();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (SubmissionInputs item : inputs) {
                String filename = uniqueFilename(sanitize(item.submission().recordLabel()) + ".pdf", usedNames);
                zos.putNextEntry(new ZipEntry(filename));
                writePdfToStream(item.live(), item.config(), item.submission(), canvas, zos);
                zos.closeEntry();
            }
            zos.finish();
            return baos.toByteArray();
        }
    }

    private static String sanitize(String stem) {
        if (stem == null || stem.isBlank()) return "submission";
        String cleaned = stem.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", "_").trim();
        return cleaned.length() > 80 ? cleaned.substring(0, 80) : cleaned;
    }

    private static String uniqueFilename(String name, Set<String> used) {
        if (used.add(name)) return name;
        int dot = name.lastIndexOf('.');
        String stem = dot >= 0 ? name.substring(0, dot) : name;
        String ext = dot >= 0 ? name.substring(dot) : "";
        int counter = 2;
        String candidate;
        do {
            candidate = stem + "_" + counter + ext;
            counter++;
        } while (!used.add(candidate));
        return candidate;
    }

    /** Tuple holding everything needed to render one submission. */
    public record SubmissionInputs(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission) {
    }
}
