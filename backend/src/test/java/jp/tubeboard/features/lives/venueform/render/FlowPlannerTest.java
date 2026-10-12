package jp.tubeboard.features.lives.venueform.render;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.render.FlowPlanner.Placement;

/** 伸びる表が、まわりの要素をどう押し下げるか。 */
class FlowPlannerTest {

    private static final float MARGIN_MM = 8f;
    private static final float TOLERANCE_PT = 0.5f;

    /** A4 横の高さ。 */
    private static final float PAGE_HEIGHT_PT = 210f * PdfBox.PT_PER_MM;

    private final TableMeasurer measurer = new TableMeasurer(new ExpressionEvaluator());
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
        VenueElement left = table("left", 8f, 20f, 130f, 20f, 25);
        VenueElement right = table("right", 150f, 20f, 130f, 20f, 1);
        VenueElement below = text("below", 8f, 50f, 280f, 8f);

        List<Placement> placements = plan(left, right, below);

        assertEquals(20f * PdfBox.PT_PER_MM, find(placements, "right").topPt(), TOLERANCE_PT,
                "a table beside the growing one should keep its position");
        assertTrue(find(placements, "below").topPt() > 50f * PdfBox.PT_PER_MM + TOLERANCE_PT,
                "an element underneath should be pushed down");
    }

    @Test
    void 押し下げは連鎖する() throws IOException {
        VenueElement first = table("first", 8f, 20f, 280f, 15f, 12);
        VenueElement second = table("second", 8f, 40f, 280f, 15f, 12);
        VenueElement last = text("last", 8f, 60f, 280f, 8f);

        List<Placement> placements = plan(first, second, last);

        Placement secondPlacement = find(placements, "second");
        Placement lastPlacement = find(placements, "last");
        // Both tables grew, and the text keeps its original 5mm gap below the second one.
        float expectedGapPt = (60f - 55f) * PdfBox.PT_PER_MM;
        assertEquals(secondPlacement.topPt() + secondPlacement.heightPt() + expectedGapPt,
                lastPlacement.topPt(), TOLERANCE_PT,
                "the text should follow the second table, which itself was pushed by the first");
    }

    @Test
    void 押し下げでページ下端を超えた要素は次のページへ送られる() throws IOException {
        VenueElement grower = table("grower", 8f, 20f, 280f, 20f, 40);
        VenueElement below = text("below", 8f, 150f, 280f, 8f);

        List<Placement> placements = plan(grower, below);

        Placement belowPlacement = find(placements, "below");
        assertTrue(belowPlacement.pageOffset() > 0, "the pushed element should move to a later page");
        assertTrue(belowPlacement.topPt() >= MARGIN_MM * PdfBox.PT_PER_MM - TOLERANCE_PT,
                "it should start below the top margin of that page");
    }

    @Test
    void 押し下げられていない要素は余白にかかっていても置いた位置のまま() throws IOException {
        VenueElement footer = text("footer", 8f, 205f, 100f, 4f);

        List<Placement> placements = plan(footer);

        assertEquals(0, find(placements, "footer").pageOffset(), "会場の書式の下端の欄は、そのページに残す");
        assertEquals(205f * PdfBox.PT_PER_MM, find(placements, "footer").topPt(), TOLERANCE_PT);
    }

    @Test
    void 戻り値は渡した順に並ぶ() throws IOException {
        VenueElement lower = text("lower", 8f, 100f, 100f, 8f);
        VenueElement upper = text("upper", 8f, 10f, 100f, 8f);

        List<Placement> placements = plan(lower, upper);

        assertEquals("lower", placements.get(0).element().id(), "重なったときの前後は書式の並びに従う");
    }

    // ────────── helpers ──────────

    private List<Placement> plan(VenueElement... elements) throws IOException {
        FlowPlanner planner = new FlowPlanner((grid, widthPt) -> measurer.measure(grid.toTable(), widthPt, fontChain,
                Map.of("fields", Map.of())));
        return planner.plan(List.of(elements), PAGE_HEIGHT_PT, MARGIN_MM * PdfBox.PT_PER_MM);
    }

    private Placement find(List<Placement> placements, String id) {
        return placements.stream()
                .filter(p -> id.equals(p.element().id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no placement for " + id));
    }

    /** A table whose rows come straight from its source list, so the count is exact. */
    private VenueElement table(String id, float x, float y, float w, float h, int rowCount) {
        List<TableSource.FieldRef> rows = new ArrayList<>(rowCount);
        for (int i = 0; i < rowCount; i++) {
            rows.add(new TableSource.FieldRef("f" + i, "項目" + i));
        }
        return new VenueElement.GridElement(id, "p1", x, y, w, h, null,
                new TableSource.FieldsSource(rows),
                List.of(new TableColumn(id + "-col", "項目", "__label__", 1f, "left", null, null, null)),
                true, 9f, null, null, false, true);
    }

    private VenueElement text(String id, float x, float y, float w, float h) {
        return new VenueElement.TextElement(id, "p1", x, y, w, h, null, "text", 10f, false,
                "left", "top", "#000000", null, null, null, null);
    }
}
