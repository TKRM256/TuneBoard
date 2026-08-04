package jp.tubeboard.features.lives.pdf.canvas;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.common.PDRectangle;

import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfLayoutEngine;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.MeasuredTable;

/**
 * Turns the absolutely positioned canvas into a list of per-page placements.
 *
 * <p>Elements keep their authored coordinates until a table grows: a table whose
 * rows need more room than its authored height expands downwards, pushes the
 * elements below it down by the same amount, and continues onto the next page
 * when the remaining space runs out. Pushing only applies to elements that
 * overlap horizontally, so side-by-side tables stay independent.
 *
 * <p>Vertical positions are expressed as a distance from the top of the page;
 * the renderer flips them into PDFBox's bottom-left origin.
 */
public class PageFlowPlanner {

    private static final float DEFAULT_MARGIN_MM = 10f;
    private static final float EPSILON = 0.01f;

    private final TableMeasurer measurer;

    public PageFlowPlanner(TableMeasurer measurer) {
        this.measurer = measurer;
    }

    /**
     * One element (or one page's worth of a table) placed on a page.
     *
     * @param rowFrom    first row index drawn here, inclusive (tables only)
     * @param rowTo      one past the last row drawn here (tables only)
     * @param drawHeader whether the column header row is drawn on this page
     */
    public record Placement(CanvasElement element, int pageIndex, float leftPt, float topPt,
            float widthPt, float heightPt, MeasuredTable measured, int rowFrom, int rowTo,
            boolean drawHeader) {
    }

    public List<Placement> plan(CanvasDocument document, PDRectangle pageBox, FontChain fontChain,
            Map<String, Object> namespace) throws IOException {
        List<CanvasElement> elements = document.elements();
        if (elements == null || elements.isEmpty()) {
            return List.of();
        }
        CanvasSchema.CanvasPage page = document.page();
        float marginPt = (page != null && page.marginMm() != null ? page.marginMm() : DEFAULT_MARGIN_MM)
                * PdfLayoutEngine.MM_TO_PT;
        float pageBottomPt = pageBox.getHeight() - marginPt;

        List<CanvasElement> ordered = new ArrayList<>(elements);
        ordered.sort(Comparator.comparing(e -> mm(e.yMm(), 0f)));

        List<Placement> placements = new ArrayList<>();
        List<Growth> growths = new ArrayList<>();
        for (CanvasElement element : ordered) {
            place(element, marginPt, pageBottomPt, fontChain, namespace, placements, growths);
        }
        return placements;
    }

    private void place(CanvasElement element, float marginPt, float pageBottomPt, FontChain fontChain,
            Map<String, Object> namespace, List<Placement> out, List<Growth> growths) throws IOException {
        float left = mm(element.xMm(), 0f) * PdfLayoutEngine.MM_TO_PT;
        float width = mm(element.wMm(), 50f) * PdfLayoutEngine.MM_TO_PT;
        float originalTop = mm(element.yMm(), 0f) * PdfLayoutEngine.MM_TO_PT;
        float originalHeight = mm(element.hMm(), 10f) * PdfLayoutEngine.MM_TO_PT;

        Anchor anchor = resolveAnchor(growths, left, left + width, originalTop);
        Growth growth = element instanceof CanvasElement.TableElement table
                ? placeTable(table, anchor, left, width, originalHeight, marginPt, pageBottomPt,
                        fontChain, namespace, out)
                : placeSimple(element, anchor, left, width, originalHeight, marginPt, pageBottomPt, out);
        growths.add(growth.withBounds(left, left + width, originalTop + originalHeight));
    }

    private Growth placeSimple(CanvasElement element, Anchor anchor, float left, float width,
            float height, float marginPt, float pageBottomPt, List<Placement> out) {
        int pageIndex = anchor.pageIndex();
        float top = anchor.topPt();
        if (top + height > pageBottomPt && top > marginPt + EPSILON) {
            pageIndex++;
            top = marginPt;
        }
        out.add(new Placement(element, pageIndex, left, top, width, height, null, 0, 0, false));
        return Growth.ending(pageIndex, top + height);
    }

    private Growth placeTable(CanvasElement.TableElement table, Anchor anchor, float left, float width,
            float minimumHeight, float marginPt, float pageBottomPt, FontChain fontChain,
            Map<String, Object> namespace, List<Placement> out) throws IOException {
        MeasuredTable measured = measurer.measure(table, width, fontChain, namespace);
        boolean showHeader = !Boolean.FALSE.equals(table.showHeader());
        int pageIndex = anchor.pageIndex();
        float top = anchor.topPt();

        if (measured.isEmpty() || Boolean.FALSE.equals(table.autoGrow())) {
            // Fixed height: draw only the rows that fit inside the authored box.
            int rowTo = rowsFitting(measured, minimumHeight, 0);
            out.add(new Placement(table, pageIndex, left, top, width, minimumHeight, measured, 0, rowTo,
                    showHeader));
            return Growth.ending(pageIndex, top + minimumHeight);
        }

        int rowCount = measured.rows().size();
        int rowIndex = 0;
        boolean firstChunk = true;
        float bottom;
        while (true) {
            float needed = measured.headerHeightPt()
                    + (rowIndex < rowCount ? measured.rows().get(rowIndex).heightPt() : 0f);
            if (top + needed > pageBottomPt && top > marginPt + EPSILON) {
                pageIndex++;
                top = marginPt;
            }
            float available = pageBottomPt - top;

            int from = rowIndex;
            float consumed = measured.headerHeightPt();
            while (rowIndex < rowCount && consumed + measured.rows().get(rowIndex).heightPt() <= available) {
                consumed += measured.rows().get(rowIndex).heightPt();
                rowIndex++;
            }
            if (rowIndex == from && rowIndex < rowCount) {
                // A row taller than a whole page still has to be drawn somewhere.
                consumed += measured.rows().get(rowIndex).heightPt();
                rowIndex++;
            }

            float height = consumed;
            if (firstChunk) {
                // The authored height acts as a minimum, but never past the page edge.
                height = Math.min(Math.max(consumed, minimumHeight), Math.max(consumed, available));
            }
            out.add(new Placement(table, pageIndex, left, top, width, height, measured, from, rowIndex,
                    showHeader));
            firstChunk = false;
            if (rowIndex >= rowCount) {
                bottom = top + height;
                break;
            }
            pageIndex++;
            top = marginPt;
        }
        return Growth.ending(pageIndex, bottom);
    }

    /** Number of rows that fit in {@code height}, starting at {@code from}. */
    private int rowsFitting(MeasuredTable measured, float height, int from) {
        float consumed = measured.headerHeightPt();
        int index = from;
        while (index < measured.rows().size()
                && consumed + measured.rows().get(index).heightPt() <= height) {
            consumed += measured.rows().get(index).heightPt();
            index++;
        }
        return index;
    }

    /**
     * Where an element ends up once the elements above it have grown. Only
     * growths that overlap horizontally and that originally sat entirely above
     * this element can push it; the lowest such push wins.
     */
    private Anchor resolveAnchor(List<Growth> growths, float left, float right, float originalTop) {
        int pageIndex = 0;
        float top = originalTop;
        for (Growth growth : growths) {
            if (growth.originalBottomPt() > originalTop + EPSILON) {
                continue;
            }
            if (right <= growth.leftPt() + EPSILON || growth.rightPt() <= left + EPSILON) {
                continue;
            }
            float candidateTop = growth.endBottomPt() + (originalTop - growth.originalBottomPt());
            if (growth.endPage() > pageIndex
                    || (growth.endPage() == pageIndex && candidateTop > top)) {
                pageIndex = growth.endPage();
                top = candidateTop;
            }
        }
        return new Anchor(pageIndex, top);
    }

    private static float mm(Float value, float fallback) {
        return value != null ? value : fallback;
    }

    private record Anchor(int pageIndex, float topPt) {
    }

    /** Where an already-placed element actually ended, so later elements can follow it. */
    private record Growth(float leftPt, float rightPt, float originalBottomPt, int endPage,
            float endBottomPt) {

        static Growth ending(int endPage, float endBottomPt) {
            return new Growth(0f, 0f, 0f, endPage, endBottomPt);
        }

        Growth withBounds(float leftPt, float rightPt, float originalBottomPt) {
            return new Growth(leftPt, rightPt, originalBottomPt, endPage, endBottomPt);
        }
    }
}
