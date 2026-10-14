package jp.tubeboard.features.lives.venueform.render;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.MeasuredTable;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;

/**
 * 1 ページの要素を、伸びる表に合わせて配置し直す。
 *
 * <p>要素は置いた位置のまま描く。ただし罫線つきの表が枠より多くの行を持つと下へ伸び、
 * 横に重なっていて下にある要素を同じだけ押し下げる。ページに収まらない分は次のページ（続きのページ）に送る。
 * 押し下げられていない要素は、余白にかかっていても置いた位置のまま描く（会場の書式の欄は端の近くにもあるため）。
 *
 * <p>縦の位置はページ上端からの距離（pt）で表す。
 */
public final class FlowPlanner {

    private static final float EPSILON = 0.01f;

    /** 罫線つきの表の行を、描くときと同じ幅と文字で測る。 */
    public interface GridMeasurer {
        MeasuredTable measure(VenueElement.GridElement grid, float widthPt) throws IOException;
    }

    /**
     * ページ（0 が元のページ、1 以降が続きのページ）に置いた要素 1 つ、または表のページごとの一部分。
     *
     * @param rowFrom    このページに描く最初の行（表だけ）
     * @param rowTo      このページに描く最後の行の次（表だけ）
     * @param drawHeader このページで見出し行を描くか（表だけ）
     */
    public record Placement(VenueElement element, int pageOffset, float leftPt, float topPt, float widthPt,
            float heightPt, MeasuredTable measured, int rowFrom, int rowTo, boolean drawHeader) {

        public PdfBox box(float pageHeightPt) {
            return PdfBox.fromTopLeftPt(leftPt, topPt, widthPt, heightPt, pageHeightPt);
        }
    }

    private final GridMeasurer measurer;

    public FlowPlanner(GridMeasurer measurer) {
        this.measurer = measurer;
    }

    /** 戻り値は elements と同じ順（重なったときの前後を保つ）。続きのページに分かれた表は続けて並ぶ。 */
    public List<Placement> plan(List<VenueElement> elements, float pageHeightPt, float marginPt) throws IOException {
        float pageBottomPt = pageHeightPt - marginPt;
        List<Integer> byTop = new ArrayList<>();
        for (int i = 0; i < elements.size(); i++) {
            byTop.add(i);
        }
        byTop.sort(Comparator.comparing(index -> pt(elements.get(index).yMm())));

        List<List<Placement>> placed = new ArrayList<>();
        for (int i = 0; i < elements.size(); i++) {
            placed.add(List.of());
        }
        List<Growth> growths = new ArrayList<>();
        for (int index : byTop) {
            VenueElement element = elements.get(index);
            float left = pt(element.xMm());
            float width = pt(element.wMm());
            float originalTop = pt(element.yMm());
            float originalHeight = pt(element.hMm());
            Anchor anchor = resolveAnchor(growths, left, left + width, originalTop);
            List<Placement> out = new ArrayList<>();
            Growth growth = element instanceof VenueElement.GridElement grid
                    ? placeGrid(grid, anchor, left, width, originalHeight, marginPt, pageBottomPt, out)
                    : placeSimple(element, anchor, originalTop, left, width, originalHeight, marginPt, pageBottomPt,
                            out);
            growths.add(growth.withBounds(left, left + width, originalTop + originalHeight));
            placed.set(index, out);
        }
        List<Placement> ordered = new ArrayList<>();
        placed.forEach(ordered::addAll);
        return ordered;
    }

    private Growth placeSimple(VenueElement element, Anchor anchor, float originalTop, float left, float width,
            float height, float marginPt, float pageBottomPt, List<Placement> out) {
        int page = anchor.pageOffset();
        float top = anchor.topPt();
        boolean pushed = page > 0 || top > originalTop + EPSILON;
        if (pushed && top + height > pageBottomPt && top > marginPt + EPSILON) {
            page++;
            top = marginPt;
        }
        out.add(new Placement(element, page, left, top, width, height, null, 0, 0, false));
        return Growth.ending(page, top + height);
    }

    private Growth placeGrid(VenueElement.GridElement grid, Anchor anchor, float left, float width,
            float minimumHeight, float marginPt, float pageBottomPt, List<Placement> out) throws IOException {
        MeasuredTable measured = measurer.measure(grid, width);
        boolean showHeader = !Boolean.FALSE.equals(grid.showHeader());
        int page = anchor.pageOffset();
        float top = anchor.topPt();

        if (measured.isEmpty() || Boolean.FALSE.equals(grid.autoGrow())) {
            // 高さを固定した表は、枠に入る行だけを描く
            out.add(new Placement(grid, page, left, top, width, minimumHeight, measured, 0,
                    rowsFitting(measured, minimumHeight), showHeader));
            return Growth.ending(page, top + minimumHeight);
        }

        int rowCount = measured.rows().size();
        int rowIndex = 0;
        boolean firstChunk = true;
        while (true) {
            float needed = measured.headerHeightPt()
                    + (rowIndex < rowCount ? measured.rows().get(rowIndex).heightPt() : 0f);
            if (top + needed > pageBottomPt && top > marginPt + EPSILON) {
                page++;
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
                // 1 ページより高い行も、どこかには描く
                consumed += measured.rows().get(rowIndex).heightPt();
                rowIndex++;
            }
            float height = consumed;
            if (firstChunk) {
                // 置いた高さは最低の高さ。ただしページの下端は越えない
                height = Math.min(Math.max(consumed, minimumHeight), Math.max(consumed, available));
            }
            out.add(new Placement(grid, page, left, top, width, height, measured, from, rowIndex, showHeader));
            firstChunk = false;
            if (rowIndex >= rowCount) {
                return Growth.ending(page, top + height);
            }
            page++;
            top = marginPt;
        }
    }

    private static int rowsFitting(MeasuredTable measured, float height) {
        float consumed = measured.headerHeightPt();
        int index = 0;
        while (index < measured.rows().size() && consumed + measured.rows().get(index).heightPt() <= height) {
            consumed += measured.rows().get(index).heightPt();
            index++;
        }
        return index;
    }

    /**
     * 上の要素が伸びたあとの置き場所。横に重なっていて、もともと完全に上にあった要素だけが押し下げる。
     * いちばん下まで押し下げたものが勝つ。
     */
    private static Anchor resolveAnchor(List<Growth> growths, float left, float right, float originalTop) {
        int page = 0;
        float top = originalTop;
        for (Growth growth : growths) {
            if (growth.originalBottomPt() > originalTop + EPSILON) {
                continue;
            }
            if (right <= growth.leftPt() + EPSILON || growth.rightPt() <= left + EPSILON) {
                continue;
            }
            float candidateTop = growth.endBottomPt() + (originalTop - growth.originalBottomPt());
            if (growth.endPage() > page || (growth.endPage() == page && candidateTop > top)) {
                page = growth.endPage();
                top = candidateTop;
            }
        }
        return new Anchor(page, top);
    }

    private static float pt(Float mm) {
        return (mm == null ? 0f : mm) * PdfBox.PT_PER_MM;
    }

    private record Anchor(int pageOffset, float topPt) {
    }

    /** 置いた要素が実際にどこで終わったか。下の要素はこれについていく。 */
    private record Growth(float leftPt, float rightPt, float originalBottomPt, int endPage, float endBottomPt) {

        static Growth ending(int endPage, float endBottomPt) {
            return new Growth(0f, 0f, 0f, endPage, endBottomPt);
        }

        Growth withBounds(float leftPt, float rightPt, float originalBottomPt) {
            return new Growth(leftPt, rightPt, originalBottomPt, endPage, endBottomPt);
        }
    }
}
