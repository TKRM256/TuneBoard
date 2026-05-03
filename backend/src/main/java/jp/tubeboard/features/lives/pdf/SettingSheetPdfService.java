package jp.tubeboard.features.lives.pdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Service;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.pdf.dsl.DslEvaluator;
import jp.tubeboard.features.lives.pdf.dsl.DslParser;
import jp.tubeboard.features.lives.pdf.dsl.DslRenderer;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslDocument;
import lombok.RequiredArgsConstructor;

/**
 * Builds a PDF byte array for a single submission. Routes between the built-in
 * Simple renderer and the user-supplied YAML/DSL renderer.
 */
@Service
@RequiredArgsConstructor
public class SettingSheetPdfService {

    private static final float MIN_AUTOFIT_FONT_SIZE = 7f;
    private static final float AUTOFIT_FONT_STEP = 0.5f;

    private final PdfFontLoader fontLoader;
    private final DslParser dslParser;
    private final DslEvaluator dslEvaluator;

    public byte[] generate(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions rawOptions,
            String customLayoutYaml) throws IOException {
        if (customLayoutYaml != null && !customLayoutYaml.isBlank()) {
            return renderDsl(live, config, submission, rawOptions, customLayoutYaml);
        }
        PdfLayoutOptions options = rawOptions == null ? PdfLayoutOptions.defaults() : rawOptions.withDefaults();
        if (Boolean.TRUE.equals(options.autoFitOnePage())) {
            byte[] fitted = renderWithAutoFit(live, config, submission, options);
            if (fitted != null) {
                return fitted;
            }
        }
        return renderSimple(live, config, submission, options);
    }

    /** Backwards-compatible overload without DSL. */
    public byte[] generate(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions rawOptions) throws IOException {
        return generate(live, config, submission, rawOptions, null);
    }

    private byte[] renderDsl(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions rawOptions,
            String yaml) throws IOException {
        DslDocument document = dslParser.parse(yaml);
        PdfLayoutOptions opts = rawOptions == null ? PdfLayoutOptions.defaults() : rawOptions.withDefaults();
        PdfPaperSize paperSize = document.page() != null && document.page().size() != null
                ? document.page().size() : opts.paperSize();
        PdfOrientation orientation = document.page() != null && document.page().orientation() != null
                ? document.page().orientation() : opts.orientation();
        float marginMm = document.page() != null && document.page().margin() != null
                ? document.page().margin() : opts.marginMm();
        float fontSize = document.page() != null && document.page().fontSize() != null
                ? document.page().fontSize() : opts.baseFontSize();

        try (PDDocument pdf = new PDDocument()) {
            PDType0Font font = fontLoader.load(pdf);
            PDRectangle pageBox = paperSize.rectangle(orientation);
            float marginPt = marginMm * PdfLayoutEngine.MM_TO_PT;
            try (PdfLayoutEngine engine = new PdfLayoutEngine(pdf, font, pageBox, marginPt, fontSize)) {
                DslRenderer renderer = new DslRenderer(engine, dslEvaluator, live, config, submission);
                renderer.render(document);
            }
            return toBytes(pdf);
        }
    }

    private byte[] renderWithAutoFit(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions options) throws IOException {
        float fontSize = options.baseFontSize();
        while (fontSize >= MIN_AUTOFIT_FONT_SIZE) {
            PdfLayoutOptions attempt = new PdfLayoutOptions(options.paperSize(), options.orientation(),
                    fontSize, options.marginMm(), options.includeItunesLinks(), options.autoFitOnePage(),
                    options.density(), options.header(), options.hiddenBlockIds(),
                    options.blockLabelOverrides());
            try (PDDocument pdf = new PDDocument()) {
                PDType0Font font = fontLoader.load(pdf);
                PDRectangle pageBox = options.paperSize().rectangle(options.orientation());
                float marginPt = options.marginMm() * PdfLayoutEngine.MM_TO_PT;
                try (PdfLayoutEngine engine = new PdfLayoutEngine(pdf, font, pageBox, marginPt, fontSize)) {
                    SubmissionPdfRenderer renderer = new SubmissionPdfRenderer(engine, attempt);
                    renderer.render(live, config, submission);
                    if (engine.pageCount() == 1) {
                        engine.close();
                        return toBytes(pdf);
                    }
                }
            }
            fontSize -= AUTOFIT_FONT_STEP;
        }
        return null;
    }

    private byte[] renderSimple(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, PdfLayoutOptions options) throws IOException {
        try (PDDocument pdf = new PDDocument()) {
            PDType0Font font = fontLoader.load(pdf);
            PDRectangle pageBox = options.paperSize().rectangle(options.orientation());
            float marginPt = options.marginMm() * PdfLayoutEngine.MM_TO_PT;
            try (PdfLayoutEngine engine = new PdfLayoutEngine(pdf, font, pageBox, marginPt,
                    options.baseFontSize())) {
                SubmissionPdfRenderer renderer = new SubmissionPdfRenderer(engine, options);
                renderer.render(live, config, submission);
            }
            return toBytes(pdf);
        }
    }

    private byte[] toBytes(PDDocument document) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            document.save(baos);
            return baos.toByteArray();
        }
    }

    /** Build a zip archive containing one PDF per provided submission. */
    public byte[] generateZip(List<SubmissionInputs> inputs, PdfLayoutOptions rawOptions, String customLayoutYaml)
            throws IOException {
        PdfLayoutOptions options = rawOptions == null ? PdfLayoutOptions.defaults() : rawOptions.withDefaults();
        Set<String> usedNames = new HashSet<>();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (SubmissionInputs item : inputs) {
                byte[] pdf = generate(item.live(), item.config(), item.submission(), options, customLayoutYaml);
                String filename = uniqueFilename(sanitize(item.submission().recordLabel()) + ".pdf", usedNames);
                ZipEntry entry = new ZipEntry(filename);
                zos.putNextEntry(entry);
                zos.write(pdf);
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
