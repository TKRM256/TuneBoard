package jp.tubeboard.features.lives.venueform.render;

import java.awt.Color;
import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDPageContentStream;

import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.TextWrapper;
import jp.tubeboard.features.lives.pdf.canvas.table.TableRows;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement.TableElement;

/**
 * 会場書式の決まった行の枠に、グループの回答を 1 件ずつ書き込む。
 * 罫線や見出しは書式側に印刷されているので描かない。行は枠の高さを行数で等分した位置に置く。
 */
public final class VenueTableDrawer {

    private static final float DEFAULT_FONT_SIZE = 9f;
    private static final float DEFAULT_MIN_FONT_SIZE = 5f;
    private static final float PAD_X = 1.5f;

    private final ExpressionEvaluator evaluator;

    public VenueTableDrawer(ExpressionEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    /** どこまで書けたか。同じグループを複数の表に分けて書くので、あふれの判定は呼び出し側でまとめて行う。 */
    public record Coverage(int totalRows, int coveredUpTo) {
    }

    public Coverage draw(PDPageContentStream stream, FontChain fontChain, TableElement table, PdfBox box,
            Map<String, Object> namespace, Color color) throws IOException {
        List<TableColumn> columns = table.columns() == null ? List.of() : table.columns();
        int maxRows = table.maxRows() == null ? 1 : Math.max(1, table.maxRows());
        int start = Math.max(1, table.startIndex() == null ? 1 : table.startIndex()) - 1;
        List<TableRows.RowData> rows = TableRows.collectGroup(table.groupId(), namespace);
        if (columns.isEmpty() || start >= rows.size()) {
            return new Coverage(rows.size(), columns.isEmpty() ? 0 : start + maxRows);
        }
        float fontSize = table.fontSizePt() != null && table.fontSizePt() > 0 ? table.fontSizePt() : DEFAULT_FONT_SIZE;
        float rowHeight = box.heightPt() / maxRows;
        float[] widths = columnWidths(columns, box.widthPt());
        int end = Math.min(rows.size(), start + maxRows);
        for (int r = start; r < end; r++) {
            float rowTop = box.topY() - (r - start) * rowHeight;
            float x = box.leftX();
            for (int c = 0; c < columns.size(); c++) {
                String text = rows.get(r).cellText(columns.get(c), evaluator, namespace);
                drawCell(stream, fontChain, text, columns.get(c), x, rowTop, widths[c], rowHeight, fontSize, color);
                x += widths[c];
            }
        }
        return new Coverage(rows.size(), start + maxRows);
    }

    private void drawCell(PDPageContentStream stream, FontChain fontChain, String text, TableColumn column,
            float x, float rowTop, float width, float rowHeight, float fontSize, Color color) throws IOException {
        if (text == null || text.isBlank()) {
            return;
        }
        float usable = Math.max(1f, width - PAD_X * 2);
        float size = Boolean.TRUE.equals(column.shrinkToFit()) ? shrunk(fontChain, text, usable, fontSize, column)
                : fontSize;
        List<String> lines = TextWrapper.wrap(fontChain, text, usable, size);
        float lineHeight = TextWrapper.lineHeight(size);
        // 行の高さに入る分だけ書く。はみ出した行は隣の行に重なるので捨てる
        int fitting = Math.max(1, (int) Math.floor(rowHeight / lineHeight));
        List<String> visible = lines.subList(0, Math.min(lines.size(), fitting));
        float blockHeight = visible.size() * lineHeight;
        float y = rowTop - (rowHeight - blockHeight) / 2f - size;
        for (String line : visible) {
            float lineWidth = TextWrapper.measure(fontChain, line, size);
            float lx;
            if ("center".equalsIgnoreCase(column.align())) {
                lx = x + (width - lineWidth) / 2f;
            } else if ("right".equalsIgnoreCase(column.align())) {
                lx = x + width - lineWidth - PAD_X;
            } else {
                lx = x + PAD_X;
            }
            stream.beginText();
            stream.setNonStrokingColor(color);
            stream.newLineAtOffset(lx, y);
            fontChain.showText(stream, line, size);
            stream.endText();
            y -= lineHeight;
        }
    }

    /** 1 行に収まる大きさまで縮める（下限あり）。 */
    private static float shrunk(FontChain fontChain, String text, float usable, float fontSize, TableColumn column)
            throws IOException {
        float widthAtOnePt = TextWrapper.widestParagraphAtOnePt(fontChain, text);
        if (widthAtOnePt <= 0f) {
            return fontSize;
        }
        float minimum = Math.min(fontSize,
                column.minFontSizePt() != null ? column.minFontSizePt() : DEFAULT_MIN_FONT_SIZE);
        return Math.max(minimum, Math.min(fontSize, usable / widthAtOnePt));
    }

    static float[] columnWidths(List<TableColumn> columns, float totalWidth) {
        float[] widths = new float[columns.size()];
        float ratioSum = 0f;
        for (TableColumn column : columns) {
            ratioSum += positiveRatio(column);
        }
        for (int i = 0; i < widths.length; i++) {
            widths[i] = ratioSum > 0 ? totalWidth * positiveRatio(columns.get(i)) / ratioSum
                    : totalWidth / widths.length;
        }
        return widths;
    }

    private static float positiveRatio(TableColumn column) {
        Float ratio = column.widthRatio();
        return ratio != null && ratio > 0 && Float.isFinite(ratio) ? ratio : 0f;
    }
}
