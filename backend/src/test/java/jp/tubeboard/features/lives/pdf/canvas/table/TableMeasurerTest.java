package jp.tubeboard.features.lives.pdf.canvas.table;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.pdf.canvas.CanvasContext;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.pdf.canvas.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.CellLayout;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.MeasuredTable;

/** Covers per-column shrinking and the row heights it produces. */
class TableMeasurerTest {

    private static final String LONG_TEXT = "とても長い曲名がここに入ります";
    private static final float FONT_SIZE = 9f;

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
    void 収まらない列は文字を縮めて1行に収める() throws IOException {
        // Half the width the text needs at 9pt, so it has to shrink to about 4.5pt.
        float width = naturalWidth() / 2f + TableMeasurer.CELL_PAD_X * 2;

        CellLayout cell = onlyCell(measure(width, column(true, 3f)));

        assertEquals(1, cell.lines().size(), "shrinking should keep the text on one line");
        assertTrue(cell.fontSizePt() < FONT_SIZE,
                "font should have been reduced; got " + cell.fontSizePt());
    }

    @Test
    void 最小サイズでも収まらなければ折り返して行を高くする() throws IOException {
        float width = naturalWidth() / 3f + TableMeasurer.CELL_PAD_X * 2;
        float minimum = 6f;

        MeasuredTable measured = measure(width, column(true, minimum));
        CellLayout cell = onlyCell(measured);

        assertEquals(minimum, cell.fontSizePt(), 0.001f, "font should stop at the column minimum");
        assertTrue(cell.lines().size() > 1, "text that still overflows must wrap, not be truncated");
        // The row grew to hold the extra lines rather than clipping them.
        assertTrue(measured.rows().get(0).heightPt() > minimum * 1.35f + TableMeasurer.CELL_PAD_Y * 2,
                "the row should be taller than a single line");
    }

    @Test
    void 縮小しない列は従来どおり折り返す() throws IOException {
        float width = naturalWidth() / 2f + TableMeasurer.CELL_PAD_X * 2;

        CellLayout cell = onlyCell(measure(width, column(false, null)));

        assertEquals(FONT_SIZE, cell.fontSizePt(), 0.001f, "font size must be left alone");
        assertTrue(cell.lines().size() > 1, "the text should wrap instead");
    }

    // ────────── helpers ──────────

    /** Width the sample text occupies on one line at the table's font size. */
    private float naturalWidth() throws IOException {
        return fontChain.stringWidth(LONG_TEXT, FONT_SIZE);
    }

    private TableColumn column(boolean shrinkToFit, Float minFontSizePt) {
        return new TableColumn(uuid(), "曲名", "", 1f, "left", null, shrinkToFit, minFontSizePt);
    }

    private MeasuredTable measure(float tableWidthPt, TableColumn column) throws IOException {
        CanvasElement.TableElement table = new CanvasElement.TableElement(uuid(), 0f, 0f, 0f, 0f,
                new TableSource.FieldsSource(List.of(new TableSource.FieldRef("song", "曲名"))),
                List.of(column), false, FONT_SIZE, null, null, false, true);
        Map<String, Object> namespace = Map.of("fields",
                Map.of("song", new CanvasContext.FieldRef(LONG_TEXT, List.of(LONG_TEXT), false)));
        return measurer.measure(table, tableWidthPt, fontChain, namespace);
    }

    private CellLayout onlyCell(MeasuredTable measured) {
        assertEquals(1, measured.rows().size(), "the fixture has a single row");
        return measured.rows().get(0).cells().get(0);
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }
}
