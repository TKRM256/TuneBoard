package jp.tubeboard.features.lives.venueform.lines;

import java.awt.geom.Point2D;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.contentstream.PDFGraphicsStreamEngine;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.image.PDImage;

import jp.tubeboard.features.lives.venueform.lines.LineSegments.Segment;

/**
 * Excel などから作った PDF のページから、描かれている縦横の線をそのまま取り出す。
 * 線として描かれたもの（stroke）と、細長い四角の塗りつぶし（表計算ソフトの罫線によくある）を線とみなす。
 * 文字は図形ではないので混ざらない。
 */
public final class VectorLineExtractor {

    private static final double PT_PER_MM = 72 / 25.4;
    private static final double MIN_LENGTH_MM = 2;
    /** 細長い塗りつぶしを線とみなす太さの上限。 */
    private static final double MAX_FILL_THICKNESS_MM = 0.8;
    /** 水平・垂直とみなす傾きの許容（pt）。 */
    private static final double AXIS_TOLERANCE_PT = 0.5;
    private static final double MERGE_POS_MM = 0.3;
    private static final double MERGE_GAP_MM = 0.5;
    /** これより明るい色の線（白い線など）は、見えない線として捨てる。 */
    private static final double MAX_LUMINANCE = 0.9;

    private VectorLineExtractor() {
    }

    /** 回転したページは扱わない（呼び出し側で画像からの検出に切り替える）。 */
    public static List<RuledLine> extract(PDPage page) throws IOException {
        Collector collector = new Collector(page);
        collector.processPage(page);
        PDRectangle box = page.getCropBox();
        List<Segment> merged = LineSegments.merge(collector.segments, MERGE_POS_MM * PT_PER_MM,
                MERGE_GAP_MM * PT_PER_MM);
        List<Segment> longEnough = merged.stream()
                .filter(s -> s.length() >= MIN_LENGTH_MM * PT_PER_MM)
                .map(s -> toTopLeft(s, box))
                .toList();
        return LineSegments.normalize(longEnough, box.getWidth(), box.getHeight());
    }

    /** PDF の座標（左下が原点）を、ページの左上を原点にした座標に直す。 */
    private static Segment toTopLeft(Segment s, PDRectangle box) {
        if (RuledLine.HORIZONTAL.equals(s.axis())) {
            return new Segment(s.axis(), box.getUpperRightY() - s.pos(),
                    s.from() - box.getLowerLeftX(), s.to() - box.getLowerLeftX());
        }
        return new Segment(s.axis(), s.pos() - box.getLowerLeftX(),
                box.getUpperRightY() - s.to(), box.getUpperRightY() - s.from());
    }

    private static final class Collector extends PDFGraphicsStreamEngine {
        final List<Segment> segments = new ArrayList<>();
        /** 今の path の線分（始点・終点の組）と、四角として追加されたもの。 */
        private final List<Point2D[]> pathLines = new ArrayList<>();
        private final List<Point2D[]> pathRects = new ArrayList<>();
        private Point2D current;
        private Point2D subpathStart;

        Collector(PDPage page) {
            super(page);
        }

        @Override
        public void appendRectangle(Point2D p0, Point2D p1, Point2D p2, Point2D p3) {
            pathRects.add(new Point2D[] { p0, p1, p2, p3 });
            current = p0;
            subpathStart = p0;
        }

        @Override
        public void moveTo(float x, float y) {
            current = new Point2D.Float(x, y);
            subpathStart = current;
        }

        @Override
        public void lineTo(float x, float y) {
            Point2D next = new Point2D.Float(x, y);
            if (current != null) pathLines.add(new Point2D[] { current, next });
            current = next;
        }

        @Override
        public void curveTo(float x1, float y1, float x2, float y2, float x3, float y3) {
            current = new Point2D.Float(x3, y3);
        }

        @Override
        public Point2D getCurrentPoint() {
            return current;
        }

        @Override
        public void closePath() {
            if (current != null && subpathStart != null) pathLines.add(new Point2D[] { current, subpathStart });
            current = subpathStart;
        }

        @Override
        public void endPath() {
            clearPath();
        }

        @Override
        public void strokePath() {
            if (isVisible(getGraphicsState().getStrokingColor())) {
                for (Point2D[] line : pathLines) addLine(line[0], line[1]);
                for (Point2D[] rect : pathRects) {
                    for (int i = 0; i < 4; i++) addLine(rect[i], rect[(i + 1) % 4]);
                }
            }
            clearPath();
        }

        @Override
        public void fillPath(int windingRule) {
            if (isVisible(getGraphicsState().getNonStrokingColor())) {
                for (Point2D[] rect : pathRects) addThinRect(rect);
                // 四角を線で描いて塗る PDF もあるので、閉じた 4 辺の path も四角として見る
                if (pathLines.size() == 4 && pathRects.isEmpty()) {
                    addThinRect(new Point2D[] { pathLines.get(0)[0], pathLines.get(1)[0], pathLines.get(2)[0],
                            pathLines.get(3)[0] });
                }
            }
            clearPath();
        }

        @Override
        public void fillAndStrokePath(int windingRule) {
            List<Point2D[]> lines = new ArrayList<>(pathLines);
            List<Point2D[]> rects = new ArrayList<>(pathRects);
            strokePath();
            pathLines.addAll(lines);
            pathRects.addAll(rects);
            fillPath(windingRule);
        }

        @Override
        public void clip(int windingRule) {
            // クリップ用の path は描かれないので何もしない（直後の endPath で捨てる）
        }

        @Override
        public void drawImage(PDImage pdImage) {
            // 画像の中の線はここでは見ない（線が見つからないページは画像として検出し直す）
        }

        @Override
        public void shadingFill(COSName shadingName) {
            // グラデーションは罫線にならない
        }

        private void clearPath() {
            pathLines.clear();
            pathRects.clear();
            current = null;
            subpathStart = null;
        }

        private void addLine(Point2D a, Point2D b) {
            double dx = Math.abs(a.getX() - b.getX());
            double dy = Math.abs(a.getY() - b.getY());
            if (dy <= AXIS_TOLERANCE_PT && dx > dy) {
                segments.add(new Segment(RuledLine.HORIZONTAL, (a.getY() + b.getY()) / 2,
                        Math.min(a.getX(), b.getX()), Math.max(a.getX(), b.getX())));
            } else if (dx <= AXIS_TOLERANCE_PT && dy > dx) {
                segments.add(new Segment(RuledLine.VERTICAL, (a.getX() + b.getX()) / 2,
                        Math.min(a.getY(), b.getY()), Math.max(a.getY(), b.getY())));
            }
        }

        /** 細長い四角の塗りつぶしは、その中心線を罫線とみなす。 */
        private void addThinRect(Point2D[] rect) {
            double minX = Double.MAX_VALUE;
            double maxX = -Double.MAX_VALUE;
            double minY = Double.MAX_VALUE;
            double maxY = -Double.MAX_VALUE;
            for (Point2D p : rect) {
                minX = Math.min(minX, p.getX());
                maxX = Math.max(maxX, p.getX());
                minY = Math.min(minY, p.getY());
                maxY = Math.max(maxY, p.getY());
            }
            double maxThickness = MAX_FILL_THICKNESS_MM * PT_PER_MM;
            double width = maxX - minX;
            double height = maxY - minY;
            if (height <= maxThickness && width > height * 3) {
                segments.add(new Segment(RuledLine.HORIZONTAL, (minY + maxY) / 2, minX, maxX));
            } else if (width <= maxThickness && height > width * 3) {
                segments.add(new Segment(RuledLine.VERTICAL, (minX + maxX) / 2, minY, maxY));
            }
        }

        private static boolean isVisible(PDColor color) {
            try {
                float[] rgb = color.getColorSpace().toRGB(color.getComponents());
                double luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
                return luminance <= MAX_LUMINANCE;
            } catch (IOException | RuntimeException ex) {
                // パターン等で色が分からないときは線として扱う
                return true;
            }
        }
    }
}
