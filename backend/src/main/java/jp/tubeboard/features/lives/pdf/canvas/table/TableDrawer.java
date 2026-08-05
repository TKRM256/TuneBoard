package jp.tubeboard.features.lives.pdf.canvas.table;

import java.awt.Color;
import java.io.IOException;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDPageContentStream;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasColors;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.TextWrapper;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.CellLayout;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.MeasuredTable;

/**
 * Draws one page's worth of a table from an already measured layout. A table
 * split across pages is drawn once per page with a different row range; the
 * column headers are repeated each time so the continuation stays readable.
 */
public class TableDrawer {

    private static final Color DEFAULT_HEADER_FILL = new Color(0xe5, 0xed, 0xf6);
    private static final Color DEFAULT_BORDER = new Color(0xd1, 0xd5, 0xdb);
    private static final Color ZEBRA_FILL = new Color(0xf9, 0xfa, 0xfb);
    private static final Color TEXT = Color.BLACK;

    /**
     * @param topY       top edge of the table on this page, in PDFBox coordinates
     * @param heightPt   height the table occupies on this page (frame and column rules use it)
     * @param rowFrom    first row to draw, inclusive
     * @param rowTo      one past the last row to draw
     * @param drawHeader whether to repeat the column header row here
     */
    public void draw(PDPageContentStream stream, FontChain fontChain, CanvasElement.TableElement table,
            MeasuredTable measured, float leftX, float topY, float widthPt, float heightPt,
            int rowFrom, int rowTo, boolean drawHeader) throws IOException {
        if (measured == null || measured.isEmpty()) {
            return;
        }
        List<TableColumn> columns = measured.columns();
        float[] widths = measured.columnWidthsPt();
        Color borderColor = CanvasColors.parse(table.borderColor(), DEFAULT_BORDER);
        Color headerFill = CanvasColors.parse(table.headerFill(), DEFAULT_HEADER_FILL);
        float headerHeight = drawHeader ? measured.headerHeightPt() : 0f;

        if (headerHeight > 0f) {
            fillRect(stream, leftX, topY - headerHeight, widthPt, headerHeight, headerFill);
            drawRow(stream, fontChain, columns, widths, measured.headerCells(), leftX, topY);
        }

        float currentY = topY - headerHeight;
        boolean zebra = Boolean.TRUE.equals(table.zebra());
        for (int r = rowFrom; r < rowTo && r < measured.rows().size(); r++) {
            TableMeasurer.RowLayout row = measured.rows().get(r);
            if (zebra && r % 2 == 1) {
                fillRect(stream, leftX, currentY - row.heightPt(), widthPt, row.heightPt(), ZEBRA_FILL);
            }
            drawRow(stream, fontChain, columns, widths, row.cells(), leftX, currentY);
            currentY -= row.heightPt();
        }

        strokeRect(stream, leftX, topY - heightPt, widthPt, heightPt, borderColor, 0.5f);
        if (headerHeight > 0f) {
            line(stream, leftX, topY - headerHeight, leftX + widthPt, topY - headerHeight, borderColor, 0.5f);
        }
        float columnX = leftX;
        for (int i = 0; i < widths.length - 1; i++) {
            columnX += widths[i];
            line(stream, columnX, topY - heightPt, columnX, topY, borderColor, 0.3f);
        }
    }

    private void drawRow(PDPageContentStream stream, FontChain fontChain, List<TableColumn> columns,
            float[] widths, List<CellLayout> cells, float leftX, float rowTopY) throws IOException {
        float x = leftX;
        for (int i = 0; i < columns.size(); i++) {
            if (i < cells.size()) {
                drawCell(stream, fontChain, cells.get(i), x, rowTopY, widths[i], columns.get(i).align());
            }
            x += widths[i];
        }
    }

    private void drawCell(PDPageContentStream stream, FontChain fontChain, CellLayout cell, float cellX,
            float rowTopY, float cellWidth, String align) throws IOException {
        float fontSize = cell.fontSizePt();
        float lineHeight = TextWrapper.lineHeight(fontSize);
        float y = rowTopY - TableMeasurer.CELL_PAD_Y - fontSize;
        for (String line : cell.lines()) {
            float lineWidth = TextWrapper.measure(fontChain, line, fontSize);
            float x;
            if ("center".equalsIgnoreCase(align)) {
                x = cellX + (cellWidth - lineWidth) / 2f;
            } else if ("right".equalsIgnoreCase(align)) {
                x = cellX + cellWidth - lineWidth - TableMeasurer.CELL_PAD_X;
            } else {
                x = cellX + TableMeasurer.CELL_PAD_X;
            }
            stream.beginText();
            stream.setNonStrokingColor(TEXT);
            stream.newLineAtOffset(x, y);
            fontChain.showText(stream, line, fontSize);
            stream.endText();
            y -= lineHeight;
        }
    }

    private void fillRect(PDPageContentStream stream, float x, float y, float w, float h, Color color)
            throws IOException {
        stream.setNonStrokingColor(color);
        stream.addRect(x, y, w, h);
        stream.fill();
    }

    private void strokeRect(PDPageContentStream stream, float x, float y, float w, float h, Color color,
            float lineWidth) throws IOException {
        stream.setStrokingColor(color);
        stream.setLineWidth(lineWidth);
        stream.addRect(x, y, w, h);
        stream.stroke();
    }

    private void line(PDPageContentStream stream, float x1, float y1, float x2, float y2, Color color,
            float lineWidth) throws IOException {
        stream.setStrokingColor(color);
        stream.setLineWidth(lineWidth);
        stream.moveTo(x1, y1);
        stream.lineTo(x2, y2);
        stream.stroke();
    }
}
