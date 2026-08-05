package jp.tubeboard.features.lives.pdf.canvas.table;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.canvas.TextWrapper;

/**
 * Lays a table out without drawing it: resolves column widths, wraps every cell
 * and derives the height each row needs. The renderer reuses the result, so each
 * cell is only wrapped once.
 */
public class TableMeasurer {

    public static final float CELL_PAD_X = 2f;
    public static final float CELL_PAD_Y = 2f;
    public static final float DEFAULT_FONT_SIZE_PT = 9f;

    private static final float DEFAULT_MIN_FONT_SIZE_PT = 6f;
    /** Shrunk font sizes are rounded down to this granularity so they stay tidy. */
    private static final float SHRINK_STEP_PT = 0.25f;

    private final ExpressionEvaluator evaluator;

    public TableMeasurer(ExpressionEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    /** A single cell's wrapped lines, at the font size that cell ended up using. */
    public record CellLayout(float fontSizePt, List<String> lines) {
    }

    public record RowLayout(float heightPt, List<CellLayout> cells) {
    }

    public record MeasuredTable(List<TableColumn> columns, float[] columnWidthsPt, List<CellLayout> headerCells,
            float headerHeightPt, float bodyFontSizePt, List<RowLayout> rows, float naturalHeightPt) {

        public boolean isEmpty() {
            return columns.isEmpty();
        }
    }

    public MeasuredTable measure(CanvasElement.TableElement table, float tableWidthPt, FontChain fontChain,
            Map<String, Object> namespace) throws IOException {
        List<TableColumn> columns = table.columns() != null ? table.columns() : List.of();
        if (columns.isEmpty()) {
            return new MeasuredTable(List.of(), new float[0], List.of(), 0f, DEFAULT_FONT_SIZE_PT, List.of(), 0f);
        }

        float fontSize = table.fontSizePt() != null ? table.fontSizePt() : DEFAULT_FONT_SIZE_PT;
        float[] widths = computeColumnWidths(columns, tableWidthPt);
        boolean showHeader = !Boolean.FALSE.equals(table.showHeader());

        List<CellLayout> headerCells = List.of();
        float headerHeight = 0f;
        if (showHeader) {
            headerCells = measureHeader(columns, widths, fontSize, fontChain);
            headerHeight = tallest(headerCells, fontSize) + CELL_PAD_Y * 2;
        }

        List<TableRows.RowData> rows = TableRows.collect(table, namespace);
        List<RowLayout> layouts = new ArrayList<>(rows.size());
        float total = headerHeight;
        for (TableRows.RowData row : rows) {
            RowLayout layout = measureRow(row, columns, widths, fontSize, fontChain, namespace);
            layouts.add(layout);
            total += layout.heightPt();
        }
        return new MeasuredTable(columns, widths, headerCells, headerHeight, fontSize, layouts, total);
    }

    /** Headers are never shrunk: a lone narrow column should not desynchronise the header row. */
    private List<CellLayout> measureHeader(List<TableColumn> columns, float[] widths, float fontSize,
            FontChain fontChain) throws IOException {
        List<CellLayout> cells = new ArrayList<>(columns.size());
        for (int i = 0; i < columns.size(); i++) {
            String header = columns.get(i).header();
            List<String> lines = header == null || header.isEmpty()
                    ? List.of()
                    : TextWrapper.wrap(fontChain, header, widths[i] - CELL_PAD_X * 2, fontSize);
            cells.add(new CellLayout(fontSize, lines));
        }
        return cells;
    }

    private float tallest(List<CellLayout> cells, float fontSize) {
        float tallest = TextWrapper.lineHeight(fontSize);
        for (CellLayout cell : cells) {
            tallest = Math.max(tallest, cell.lines().size() * TextWrapper.lineHeight(cell.fontSizePt()));
        }
        return tallest;
    }

    private RowLayout measureRow(TableRows.RowData row, List<TableColumn> columns, float[] widths,
            float fontSize, FontChain fontChain, Map<String, Object> namespace) throws IOException {
        List<CellLayout> cells = new ArrayList<>(columns.size());
        for (int i = 0; i < columns.size(); i++) {
            TableColumn column = columns.get(i);
            String text = row.cellText(column, evaluator, namespace);
            cells.add(layoutCell(text, widths[i] - CELL_PAD_X * 2, fontSize, column, fontChain));
        }
        // An all-empty row still takes one line.
        return new RowLayout(tallest(cells, fontSize) + CELL_PAD_Y * 2, cells);
    }

    private CellLayout layoutCell(String text, float usableWidth, float fontSize, TableColumn column,
            FontChain fontChain) throws IOException {
        if (text == null || text.isEmpty()) {
            return new CellLayout(fontSize, List.of());
        }
        float size = Boolean.TRUE.equals(column.shrinkToFit())
                ? shrunkFontSize(text, usableWidth, fontSize, column, fontChain)
                : fontSize;
        return new CellLayout(size, TextWrapper.wrap(fontChain, text, usableWidth, size));
    }

    /**
     * Largest size at or below {@code fontSize} that keeps the text on one line,
     * floored at the column's minimum. Glyph widths scale linearly with the font
     * size, so the fitting size follows from a single measurement at 1pt — no
     * search needed. Text that does not fit even at the minimum keeps the minimum
     * and wraps instead, which grows the row rather than truncating.
     */
    private float shrunkFontSize(String text, float usableWidth, float fontSize, TableColumn column,
            FontChain fontChain) throws IOException {
        float widthAtOnePt = TextWrapper.widestParagraphAtOnePt(fontChain, text);
        if (widthAtOnePt <= 0f || usableWidth <= 0f) {
            return fontSize;
        }
        float fitting = usableWidth / widthAtOnePt;
        if (fitting >= fontSize) {
            return fontSize;
        }
        float minimum = Math.min(fontSize, column.minFontSizePt() != null
                ? column.minFontSizePt()
                : DEFAULT_MIN_FONT_SIZE_PT);
        float stepped = (float) (Math.floor(fitting / SHRINK_STEP_PT) * SHRINK_STEP_PT);
        return Math.max(minimum, stepped);
    }

    private float[] computeColumnWidths(List<TableColumn> columns, float totalWidth) {
        float[] widths = new float[columns.size()];
        float assigned = 0f;
        int unset = 0;
        for (int i = 0; i < columns.size(); i++) {
            Float ratio = columns.get(i).widthRatio();
            if (ratio != null && ratio > 0f) {
                widths[i] = totalWidth * ratio;
                assigned += widths[i];
            } else {
                unset++;
            }
        }
        if (unset > 0) {
            float remaining = Math.max(0, totalWidth - assigned);
            float each = remaining / unset;
            for (int i = 0; i < widths.length; i++) {
                if (widths[i] == 0f)
                    widths[i] = each;
            }
        } else if (assigned > 0 && Math.abs(assigned - totalWidth) > 0.01f) {
            float scale = totalWidth / assigned;
            for (int i = 0; i < widths.length; i++)
                widths[i] *= scale;
        }
        return widths;
    }
}
