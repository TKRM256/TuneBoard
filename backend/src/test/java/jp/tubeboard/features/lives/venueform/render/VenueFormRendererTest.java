package jp.tubeboard.features.lives.venueform.render;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.asset.AssetInspector;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetPurpose;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings.PaletteItem;
import jp.tubeboard.features.lives.stageplot.icon.IconNode;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.PageBackground;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;

class VenueFormRendererTest {

    private static final List<IconNode> CIRCLE = List.of(
            new IconNode("circle", Map.of("cx", "12", "cy", "12", "r", "10")),
            new IconNode("path", Map.of("d", "M8 12h8")));

    private final PdfFontLoader fontLoader = new PdfFontLoader();
    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();

    @BeforeEach
    void loadFont() throws Exception {
        Method init = PdfFontLoader.class.getDeclaredMethod("loadOnStartup");
        init.setAccessible(true);
        init.invoke(fontLoader);
    }

    @Test
    void 背景PDFの上に値を書き込み条件が偽の要素は描かない() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        String text = render(document(background.getId(), List.of(
                text("t1", "${live.name} / ${fields['band'].value}", null),
                text("t2", "ベースあり", "contains(fields['parts'].values, 'Bass')"),
                text("t3", "ドラムあり", "contains(fields['parts'].values, 'Drum')"))),
                background, warnings);

        assertThat(text).contains("BACKGROUND-MARK");
        assertThat(text).contains("サマーライブ / KingGnu");
        assertThat(text).contains("ベースあり");
        assertThat(text).doesNotContain("ドラムあり");
        assertThat(warnings.list()).isEmpty();
    }

    @Test
    void 表は開始位置から決めた行数だけ書きあふれた分を警告する() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        VenueElement.TableElement firstHalf = table("tb1", 1, 2);
        VenueElement.TableElement secondHalf = table("tb2", 3, 1);
        String text = render(document(background.getId(), List.of(firstHalf, secondHalf)), background, warnings);

        assertThat(text).contains("1 曲目A", "2 曲目B", "3 曲目C");
        assertThat(text).doesNotContain("曲目D");
        assertThat(warnings.list()).singleElement().asString().contains("入りきらない回答が1件", "セットリスト");
    }

    @Test
    void 分けた表で全部書ければ警告しない() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        render(document(background.getId(), List.of(table("tb1", 1, 2), table("tb2", 3, 2))), background, warnings);

        assertThat(warnings.list()).isEmpty();
    }

    @Test
    void 表の欄に並べたテキストで書ききれない件も警告する() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        String text = render(document(background.getId(), List.of(
                text("r1", "${groups['setlist'].items[0].field('song-title').value}", null),
                text("r2", "${groups[\"setlist\"].items[1].field('song-title').value}", null),
                text("n3", "3", "${count(groups['setlist'].items) >= 3 && groups['setlist'].items[2] != null}"))),
                background, warnings);

        assertThat(text).contains("曲目A", "曲目B");
        assertThat(warnings.list()).singleElement().asString().contains("入りきらない回答が1件", "セットリスト");
    }

    @Test
    void 表の欄に全件分のテキストがあれば警告しない() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        render(document(background.getId(), List.of(
                table("tb1", 1, 2),
                text("r3", "${groups['setlist'].items[2].field('song-title').value}", null),
                text("r4", "${groups['setlist'].items[3].field('song-title').value}", null))),
                background, warnings);

        assertThat(warnings.list()).isEmpty();
    }

    @Test
    void 書き間違えた条件式は描かずに警告にする() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        String text = render(document(background.getId(), List.of(text("t1", "見えない", "contains(fields["))),
                background, warnings);

        assertThat(text).doesNotContain("見えない");
        assertThat(warnings.list()).singleElement().asString().contains("表示条件を評価できません");
    }

    @Test
    void 式の誤りは紙面に出さずに警告にする() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        String text = render(document(background.getId(), List.of(text("t1", "前${contains(}後", null))),
                background, warnings);

        assertThat(text).contains("前後").doesNotContain("評価");
        assertThat(warnings.list()).singleElement().asString().contains("式を評価できません");
    }

    @Test
    void アイコン図形と配置図を描ける() throws IOException {
        LiveAsset background = backgroundAsset();
        RenderWarnings warnings = new RenderWarnings();
        VenueElement icon = new VenueElement.IconElement("i1", "p1", 10f, 10f, 10f, 10f, null, "circle", CIRCLE,
                "#dc2626", 2f);
        VenueElement shape = new VenueElement.ShapeElement("s1", "p1", 30f, 10f, 20f, 8f, null, "ellipse",
                "#dc2626", 1f, null);
        VenueElement plot = new VenueElement.StagePlotElement("sp1", "p1", 20f, 100f, 160f, 100f, null, "stage",
                null, null, "withBase", 8f);
        String text = render(document(background.getId(), List.of(icon, shape, plot)), background, warnings);

        assertThat(text).contains("Gt 田中");
        assertThat(warnings.list()).isEmpty();
    }

    // ───────── fixtures ─────────

    private String render(VenueFormDocument document, LiveAsset background, RenderWarnings warnings)
            throws IOException {
        StagePlotSettings stagePlot = new StagePlotSettings(null, 1.6, 0.1,
                List.of(new PaletteItem("gt", "circle", "Gt", "#111827", CIRCLE)));
        VenueFormRenderer.Resources resources = new VenueFormRenderer.Resources(
                Map.of(background.getId(), background), stagePlot, null);
        try (PDDocument pdf = new PDDocument();
                VenueFormRenderer renderer = new VenueFormRenderer(evaluator, live(), config(), submission(),
                        resources);
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            FontChain fontChain = fontLoader.loadFontChain(pdf);
            renderer.render(document, pdf, fontChain, warnings);
            pdf.save(out);
            try (PDDocument saved = Loader.loadPDF(out.toByteArray())) {
                assertThat(saved.getNumberOfPages()).isEqualTo(1);
                return Normalizer.normalize(new PDFTextStripper().getText(saved), Normalizer.Form.NFKC);
            }
        }
    }

    private static VenueFormDocument document(UUID assetId, List<VenueElement> elements) {
        return new VenueFormDocument(List.of(new VenuePage("p1", 210f, 297f, new PageBackground(assetId, 0))),
                elements);
    }

    private static VenueElement.TextElement text(String id, String content, String condition) {
        return new VenueElement.TextElement(id, "p1", 10f, 30f + id.hashCode() % 5 * 10f, 150f, 8f, condition,
                content, 10f, false, "left", "middle", "#111827");
    }

    private static VenueElement.TableElement table(String id, int startIndex, int maxRows) {
        List<TableColumn> columns = List.of(
                new TableColumn("c1", "", "__index__", 0.2f, "left", null, false, null),
                new TableColumn("c2", "", "song-title", 0.8f, "left", null, false, null));
        return new VenueElement.TableElement(id, "p1", 10f, 150f + startIndex * 15f, 150f, maxRows * 8f, null,
                "setlist", columns, startIndex, maxRows, 10f, "#111827");
    }

    private static LiveAsset backgroundAsset() throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(40, 800);
                stream.showText("BACKGROUND-MARK");
                stream.endText();
            }
            doc.save(out);
            LiveAsset asset = LiveAsset.builder()
                    .id(UUID.randomUUID())
                    .purpose(LiveAssetPurpose.VENUE_FORM)
                    .fileName("venue.pdf")
                    .contentType(AssetInspector.PDF)
                    .content(out.toByteArray())
                    .sizeBytes(out.size())
                    .metaJson("{}")
                    .build();
            return asset;
        }
    }

    private static LiveResponse live() {
        return new LiveResponse(UUID.randomUUID(), UUID.randomUUID(), "テストテナント", "tok", "サマーライブ",
                LocalDate.of(2026, 7, 1), "渋谷ホール", LocalDateTime.of(2026, 6, 25, 18, 0), LiveStatus.PUBLISHED);
    }

    private static SettingSheetConfigResponse config() {
        LayoutResponse layout = new LayoutResponse("full", 1, false);
        FormBlockResponse band = block("band", "SHORT_TEXT", "バンド名", List.of(), layout);
        FormBlockResponse parts = new FormBlockResponse("parts", "MULTI_SELECT", "パート", "", false, false, false,
                false, false, "outline", "plain", List.of("Bass", "Drum", "Vocal"), 0, "", "", "", List.of(), layout,
                null, "", List.of());
        FormBlockResponse stage = block("stage", "STAGE_PLOT", "配置図", List.of(), layout);
        FormBlockResponse title = block("song-title", "SHORT_TEXT", "曲名", List.of(), layout);
        FormBlockResponse setlist = new FormBlockResponse("setlist", "REPEATABLE_GROUP", "セットリスト", "", false,
                false, false, false, false, "subtle", "outline", List.of(), 0, "追加", "曲", "", List.of(title),
                layout, null, "", List.of());
        return new SettingSheetConfigResponse("フォーム", "", "送信", true, List.of(band, parts, stage, setlist));
    }

    private static FormBlockResponse block(String id, String type, String label, List<FormBlockResponse> fields,
            LayoutResponse layout) {
        return new FormBlockResponse(id, type, label, "", false, false, false, false, false, "outline", "plain",
                List.of(), 0, "", "", "", fields, layout, null, "", List.of());
    }

    private static PublicSettingSheetSubmissionDetailResponse submission() {
        List<GroupItemResponse> songs = List.of("曲目A", "曲目B", "曲目C", "曲目D").stream()
                .map(title -> new GroupItemResponse("",
                        List.of(new FieldAnswerResponse("song-title", List.of(title), List.of()))))
                .toList();
        String plot = "{\"items\":[{\"id\":\"1\",\"paletteId\":\"gt\",\"label\":\"Gt 田中\",\"x\":0.3,\"y\":0.4}]}";
        return new PublicSettingSheetSubmissionDetailResponse(UUID.randomUUID(), "KingGnu", "完成",
                LocalDateTime.of(2026, 6, 20, 12, 0), LocalDateTime.of(2026, 6, 20, 12, 0), 0L,
                List.of(
                        new FieldAnswerResponse("band", List.of("KingGnu"), List.of()),
                        new FieldAnswerResponse("parts", List.of("Bass", "Vocal"), List.of()),
                        new FieldAnswerResponse("stage", List.of(plot), List.of()),
                        new FieldAnswerResponse("setlist", List.of(), songs)),
                List.of());
    }
}
