package jp.tubeboard.features.lives.pdf.canvas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.pdf.PdfLayoutEngine;
import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasPage;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.pdf.canvas.PageFlowPlanner.Placement;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;

/** Covers how growing tables displace the elements around them. */
class PageFlowPlannerTest {

    private static final float MARGIN_MM = 8f;
    private static final float TOLERANCE_PT = 0.5f;

    private final PageFlowPlanner planner = new PageFlowPlanner(new TableMeasurer(new ExpressionEvaluator()));
    private final PdfFontLoader fontLoader = new PdfFontLoader();

    private PDDocument pdf;
    private FontChain fontChain;

    @BeforeEach
    void setUp() throws Exception {
        Method init = PdfFontLoader.class.getDeclaredMethod("loadOnStartup");
        init.setAccessible(true);
        init.invoke(fontLoader);
        pdf = new PDDocument();
        fontChain = fontLoader.loadFontChain(pdf);
    }

    @AfterEach
    void tearDown() throws IOException {
        pdf.close();
    }

    @Test
    void 横に並んだ表は互いに押し下げない() throws IOException {
        CanvasElement left = table("left", 8f, 20f, 130f, 20f, 25);
        CanvasElement right = table("right", 150f, 20f, 130f, 20f, 1);
        CanvasElement below = text("below", 8f, 50f, 280f, 8f);

        List<Placement> placements = plan(left, right, below);

        assertEquals(20f * PdfLayoutEngine.MM_TO_PT, find(placements, "right").topPt(), TOLERANCE_PT,
                "a table beside the growing one should keep its position");
        assertTrue(find(placements, "below").topPt() > 50f * PdfLayoutEngine.MM_TO_PT + TOLERANCE_PT,
                "an element underneath should be pushed down");
    }

    @Test
    void 押し下げは連鎖する() throws IOException {
        CanvasElement first = table("first", 8f, 20f, 280f, 15f, 12);
        CanvasElement second = table("second", 8f, 40f, 280f, 15f, 12);
        CanvasElement last = text("last", 8f, 60f, 280f, 8f);

        List<Placement> placements = plan(first, second, last);

        Placement secondPlacement = find(placements, "second");
        Placement lastPlacement = find(placements, "last");
        // Both tables grew, and the text keeps its original 5mm gap below the second one.
        float expectedGapPt = (60f - 55f) * PdfLayoutEngine.MM_TO_PT;
        assertEquals(secondPlacement.topPt() + secondPlacement.heightPt() + expectedGapPt,
                lastPlacement.topPt(), TOLERANCE_PT,
                "the text should follow the second table, which itself was pushed by the first");
    }

    @Test
    void 押し下げでページ下端を超えた要素は次のページへ送られる() throws IOException {
        CanvasElement grower = table("grower", 8f, 20f, 280f, 20f, 40);
        CanvasElement below = text("below", 8f, 150f, 280f, 8f);

        List<Placement> placements = plan(grower, below);

        Placement belowPlacement = find(placements, "below");
        assertTrue(belowPlacement.pageIndex() > 0, "the pushed element should move to a later page");
        assertTrue(belowPlacement.topPt() >= MARGIN_MM * PdfLayoutEngine.MM_TO_PT - TOLERANCE_PT,
                "it should start below the top margin of that page");
    }

    // ────────── helpers ──────────

    private List<Placement> plan(CanvasElement... elements) throws IOException {
        CanvasDocument doc = new CanvasDocument(
                new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, MARGIN_MM, 9f),
                List.of(elements));
        PDRectangle pageBox = PdfPaperSize.A4.rectangle(PdfOrientation.LANDSCAPE);
        return planner.plan(doc, pageBox, fontChain, Map.of("fields", Map.of()));
    }

    private Placement find(List<Placement> placements, String id) {
        return placements.stream()
                .filter(p -> id.equals(p.element().id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no placement for " + id));
    }

    /** A table whose rows come straight from its source list, so the count is exact. */
    private CanvasElement table(String id, float x, float y, float w, float h, int rowCount) {
        List<TableSource.FieldRef> rows = new ArrayList<>(rowCount);
        for (int i = 0; i < rowCount; i++) {
            rows.add(new TableSource.FieldRef("f" + i, "項目" + i));
        }
        return new CanvasElement.TableElement(id, x, y, w, h,
                new TableSource.FieldsSource(rows),
                List.of(new TableColumn(id + "-col", "項目", "__label__", 1f, "left", null, null, null)),
                true, 9f, null, null, false, true);
    }

    private CanvasElement text(String id, float x, float y, float w, float h) {
        return new CanvasElement.TextElement(id, x, y, w, h, "text", 10f, false, false,
                "left", "top", "#000000", null, null, null);
    }
}
