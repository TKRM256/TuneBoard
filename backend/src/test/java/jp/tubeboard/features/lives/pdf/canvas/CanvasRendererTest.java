package jp.tubeboard.features.lives.pdf.canvas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.Method;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasPage;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;

/**
 * Renders a synthetic canvas through the full pipeline and asserts the PDF
 * contains the expected text. Catches regressions in the pdf primitives,
 * coordinate flipping, and JEXL interpolation.
 */
class CanvasRendererTest {

    private static final LayoutResponse LAYOUT_HALF = new LayoutResponse("half", 1, false);

    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();
    private final PdfFontLoader fontLoader = new PdfFontLoader();

    @BeforeEach
    void loadFont() throws Exception {
        // PdfFontLoader is a @Component that initializes via @PostConstruct.
        // Outside Spring we have to invoke the lifecycle method ourselves.
        Method init = PdfFontLoader.class.getDeclaredMethod("loadOnStartup");
        init.setAccessible(true);
        init.invoke(fontLoader);
    }

    @Test
    void renderTextElementProducesReadablePdf() throws IOException {
        CanvasDocument doc = new CanvasDocument(
                new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 10f),
                List.of(
                        text("hello", 10, 10, 100, 12, "${live.name}", 16f, true),
                        text("date", 10, 25, 100, 8, "${formatDate(live.date, 'yyyy/M/d')}", 9f, false)));
        String text = renderToText(doc);
        assertTrue(text.contains("サマーライブ"), "live.name should be interpolated; got: " + text);
        assertTrue(text.contains("2026/7/1"), "date should be formatted; got: " + text);
    }

    @Test
    void renderFieldElementUsesFormAnswerValue() throws IOException {
        CanvasDocument doc = new CanvasDocument(
                new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 10f),
                List.of(field("band", 10, 10, 100, 8, "band-name", "バンド名", true)));
        String text = renderToText(doc);
        assertTrue(text.contains("バンド名"), "label should appear when showLabel=true: " + text);
        assertTrue(text.contains("KingGnu"), "field value should appear: " + text);
    }

    @Test
    void renderGroupTableExpandsItemRows() throws IOException {
        TableColumn no = new TableColumn(uuid(), "No", "__index__", 0.1f, "center", null);
        TableColumn name = new TableColumn(uuid(), "氏名", "member-name", 0.5f, "left", null);
        TableColumn parts = new TableColumn(uuid(), "パート", "member-parts", 0.4f, "left", null);
        CanvasElement.TableElement table = new CanvasElement.TableElement(uuid(),
                10f, 30f, 200f, 80f,
                new TableSource.GroupSource("members", "出演者"),
                List.of(no, name, parts), true, 9f, "#e5edf6", "#d1d5db", false);

        CanvasDocument doc = new CanvasDocument(
                new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 10f),
                List.of(table));
        String text = renderToText(doc);
        assertTrue(text.contains("田中"), "row 1 name missing: " + text);
        assertTrue(text.contains("佐藤"), "row 2 name missing: " + text);
        assertTrue(text.contains("Vo / Gt"), "row 1 parts missing: " + text);
        assertTrue(text.contains("氏名"), "header missing: " + text);
    }

    @Test
    void supportsAllPaperSizes() throws IOException {
        for (PdfPaperSize size : PdfPaperSize.values()) {
            CanvasDocument doc = new CanvasDocument(
                    new CanvasPage(size, PdfOrientation.PORTRAIT, 5f, 9f),
                    List.of(text("t", 5, 5, 50, 8, "size: " + size.name(), 9f, false)));
            byte[] bytes = renderToBytes(doc);
            assertNotNull(bytes);
            assertTrue(bytes.length > 0, size + " produced empty PDF");
        }
    }

    @Test
    void rendererHandlesMissingFieldGracefully() throws IOException {
        CanvasDocument doc = new CanvasDocument(
                new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 10f),
                List.of(field("missing", 10, 10, 100, 8, "no-such-field", "Missing", false)));
        String text = renderToText(doc);
        // The renderer should produce a page with no exception even for an unknown field id.
        assertNotNull(text);
    }

    @Test
    void emptyCanvasProducesSinglePage() throws IOException {
        CanvasDocument doc = new CanvasDocument(
                new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 10f),
                List.of());
        try (PDDocument pdf = render(doc)) {
            assertEquals(1, pdf.getNumberOfPages());
        }
    }

    // ────────── helpers ──────────

    private String renderToText(CanvasDocument doc) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(renderToBytes(doc))) {
            String raw = new PDFTextStripper().getText(pdf);
            // PDFBox sometimes extracts CJK glyphs as Kangxi Radicals (U+2F00–U+2FDF)
            // when reading IPAex Gothic; NFKC folds them to standard ideographs so
            // assertions on Japanese text aren't flaky.
            return Normalizer.normalize(raw, Normalizer.Form.NFKC);
        }
    }

    private byte[] renderToBytes(CanvasDocument doc) throws IOException {
        try (PDDocument pdf = render(doc); java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            pdf.save(baos);
            return baos.toByteArray();
        }
    }

    private PDDocument render(CanvasDocument doc) throws IOException {
        PDDocument pdf = new PDDocument();
        PDType0Font font = fontLoader.load(pdf);
        CanvasRenderer renderer = new CanvasRenderer(evaluator, sampleLive(), sampleConfig(), sampleSubmission());
        renderer.render(doc, pdf, font);
        return pdf;
    }

    private CanvasElement.TextElement text(String id, float x, float y, float w, float h,
            String content, float fs, boolean bold) {
        return new CanvasElement.TextElement(id, x, y, w, h, content, fs, bold, false,
                "left", "top", "#000000", null, null, null);
    }

    private CanvasElement.FieldElement field(String id, float x, float y, float w, float h,
            String fieldId, String fallbackLabel, boolean showLabel) {
        return new CanvasElement.FieldElement(id, x, y, w, h, fieldId, fallbackLabel, showLabel, null,
                10f, false, "left", "top", "#000000", null, null, null);
    }

    private LiveResponse sampleLive() {
        return new LiveResponse(UUID.randomUUID(), UUID.randomUUID(), "テストテナント", "tok",
                "サマーライブ", LocalDate.of(2026, 7, 1), "渋谷ホール",
                LocalDateTime.of(2026, 6, 25, 18, 0), LiveStatus.PUBLISHED);
    }

    private SettingSheetConfigResponse sampleConfig() {
        FormBlockResponse bandName = leaf("band-name", "SHORT_TEXT", "バンド名");
        FormBlockResponse memberName = leaf("member-name", "SHORT_TEXT", "氏名");
        FormBlockResponse memberPart = leaf("member-parts", "MULTI_SELECT", "パート");
        FormBlockResponse members = group("members", "出演者", List.of(memberName, memberPart));
        return new SettingSheetConfigResponse("バンド申請", "", "送信", true, List.of(bandName, members));
    }

    private PublicSettingSheetSubmissionDetailResponse sampleSubmission() {
        FieldAnswerResponse bandName = new FieldAnswerResponse("band-name", List.of("KingGnu"), List.of());
        FieldAnswerResponse memberItems = new FieldAnswerResponse("members", List.of(), List.of(
                new GroupItemResponse(null, List.of(
                        new FieldAnswerResponse("member-name", List.of("田中"), List.of()),
                        new FieldAnswerResponse("member-parts", List.of("Vo", "Gt"), List.of()))),
                new GroupItemResponse(null, List.of(
                        new FieldAnswerResponse("member-name", List.of("佐藤"), List.of()),
                        new FieldAnswerResponse("member-parts", List.of("Ba"), List.of())))));
        return new PublicSettingSheetSubmissionDetailResponse(UUID.randomUUID(), "KingGnu", "完成",
                LocalDateTime.of(2026, 6, 20, 12, 0), 0L, List.of(bandName, memberItems), List.of());
    }

    private FormBlockResponse leaf(String id, String type, String label) {
        return new FormBlockResponse(id, type, label, "", false, true, false, false,
                "outline", "plain", List.of(), 0, "", "", "", List.of(), LAYOUT_HALF, null, "", List.of());
    }

    private FormBlockResponse group(String id, String label, List<FormBlockResponse> children) {
        return new FormBlockResponse(id, "REPEATABLE_GROUP", label, "", false, true, false, true,
                "subtle", "outline", List.of(), 1, "追加", "項目", "", children, LAYOUT_HALF, null, "",
                List.of(new VariantResponse("default", "default", children)));
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }
}
