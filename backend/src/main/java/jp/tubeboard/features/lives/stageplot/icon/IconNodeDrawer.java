package jp.tubeboard.features.lives.stageplot.icon;

import java.awt.Color;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDPageContentStream;

import jp.tubeboard.features.lives.pdf.draw.PdfBox;

/**
 * lucide アイコン（24×24 の viewBox、線で描くアイコン）を PDF の枠に収めて描く。
 * 解釈できない図形は飛ばし、アイコン全体は描けるだけ描く。
 */
public final class IconNodeDrawer {

    private static final float VIEW_BOX = 24f;
    /** ベジェで円を近似するときの係数 4/3 * (√2 - 1)。 */
    private static final float KAPPA = 0.5522848f;

    private IconNodeDrawer() {
    }

    public static void draw(PDPageContentStream stream, List<IconNode> nodes, PdfBox box, Color color,
            float strokeWidth) throws IOException {
        if (nodes == null || nodes.isEmpty()) {
            return;
        }
        float scale = Math.min(box.widthPt(), box.heightPt()) / VIEW_BOX;
        float offsetX = box.leftX() + (box.widthPt() - VIEW_BOX * scale) / 2f;
        float offsetY = box.topY() - (box.heightPt() - VIEW_BOX * scale) / 2f;
        Mapper map = new Mapper(offsetX, offsetY, scale);

        stream.saveGraphicsState();
        stream.setStrokingColor(color);
        stream.setNonStrokingColor(color);
        stream.setLineWidth(strokeWidth * scale);
        stream.setLineCapStyle(1);
        stream.setLineJoinStyle(1);
        for (IconNode node : nodes) {
            if (drawShape(stream, node, map)) {
                finish(stream, node);
            }
        }
        stream.restoreGraphicsState();
    }

    private static boolean drawShape(PDPageContentStream stream, IconNode node, Mapper m) throws IOException {
        switch (node.tag()) {
            case "path" -> {
                // 壊れた path は丸ごと飛ばす。途中まで書いたパスが残らないよう、解釈し終えてから書き出す
                RecordingSink recorded = new RecordingSink();
                try {
                    SvgPathParser.parse(node.attr("d"), recorded);
                } catch (IllegalArgumentException ex) {
                    return false;
                }
                if (recorded.isEmpty()) {
                    return false;
                }
                recorded.replay(new StreamSink(stream, m));
            }
            case "circle" -> {
                float r = node.number("r", 0);
                ellipse(stream, m, node.number("cx", 0), node.number("cy", 0), r, r);
            }
            case "ellipse" -> ellipse(stream, m, node.number("cx", 0), node.number("cy", 0),
                    node.number("rx", 0), node.number("ry", 0));
            case "rect" -> rect(stream, m, node);
            case "line" -> {
                stream.moveTo(m.x(node.number("x1", 0)), m.y(node.number("y1", 0)));
                stream.lineTo(m.x(node.number("x2", 0)), m.y(node.number("y2", 0)));
            }
            case "polyline", "polygon" -> {
                if (!points(stream, m, node.attr("points"))) {
                    return false;
                }
                if ("polygon".equals(node.tag())) {
                    stream.closePath();
                }
            }
            default -> {
                return false;
            }
        }
        return true;
    }

    /**
     * lucide は線で描くアイコン、楽器アイコン（Qlementine）は塗りで描くアイコン。
     * 塗りの図形は stroke="none" で、穴あきの形は fill-rule="evenodd" で描き分ける。
     */
    private static void finish(PDPageContentStream stream, IconNode node) throws IOException {
        String fill = node.attr("fill");
        boolean filled = fill != null && !fill.isBlank() && !"none".equalsIgnoreCase(fill);
        boolean stroked = !"none".equalsIgnoreCase(node.attr("stroke"));
        boolean evenOdd = "evenodd".equalsIgnoreCase(node.attr("fill-rule"));
        if (filled && stroked) {
            if (evenOdd) {
                stream.fillAndStrokeEvenOdd();
            } else {
                stream.fillAndStroke();
            }
        } else if (filled) {
            if (evenOdd) {
                stream.fillEvenOdd();
            } else {
                stream.fill();
            }
        } else {
            stream.stroke();
        }
    }

    private static void ellipse(PDPageContentStream s, Mapper m, float cx, float cy, float rx, float ry)
            throws IOException {
        float kx = rx * KAPPA;
        float ky = ry * KAPPA;
        s.moveTo(m.x(cx + rx), m.y(cy));
        s.curveTo(m.x(cx + rx), m.y(cy + ky), m.x(cx + kx), m.y(cy + ry), m.x(cx), m.y(cy + ry));
        s.curveTo(m.x(cx - kx), m.y(cy + ry), m.x(cx - rx), m.y(cy + ky), m.x(cx - rx), m.y(cy));
        s.curveTo(m.x(cx - rx), m.y(cy - ky), m.x(cx - kx), m.y(cy - ry), m.x(cx), m.y(cy - ry));
        s.curveTo(m.x(cx + kx), m.y(cy - ry), m.x(cx + rx), m.y(cy - ky), m.x(cx + rx), m.y(cy));
        s.closePath();
    }

    private static void rect(PDPageContentStream s, Mapper m, IconNode node) throws IOException {
        float x = node.number("x", 0);
        float y = node.number("y", 0);
        float w = node.number("width", 0);
        float h = node.number("height", 0);
        float r = Math.min(Math.min(node.number("rx", node.number("ry", 0)), w / 2f), h / 2f);
        if (r <= 0) {
            s.moveTo(m.x(x), m.y(y));
            s.lineTo(m.x(x + w), m.y(y));
            s.lineTo(m.x(x + w), m.y(y + h));
            s.lineTo(m.x(x), m.y(y + h));
            s.closePath();
            return;
        }
        float k = r * KAPPA;
        s.moveTo(m.x(x + r), m.y(y));
        s.lineTo(m.x(x + w - r), m.y(y));
        s.curveTo(m.x(x + w - r + k), m.y(y), m.x(x + w), m.y(y + r - k), m.x(x + w), m.y(y + r));
        s.lineTo(m.x(x + w), m.y(y + h - r));
        s.curveTo(m.x(x + w), m.y(y + h - r + k), m.x(x + w - r + k), m.y(y + h), m.x(x + w - r), m.y(y + h));
        s.lineTo(m.x(x + r), m.y(y + h));
        s.curveTo(m.x(x + r - k), m.y(y + h), m.x(x), m.y(y + h - r + k), m.x(x), m.y(y + h - r));
        s.lineTo(m.x(x), m.y(y + r));
        s.curveTo(m.x(x), m.y(y + r - k), m.x(x + r - k), m.y(y), m.x(x + r), m.y(y));
        s.closePath();
    }

    private static boolean points(PDPageContentStream s, Mapper m, String points) throws IOException {
        if (points == null || points.isBlank()) {
            return false;
        }
        String[] parts = points.trim().split("[\\s,]+");
        if (parts.length < 4) {
            return false;
        }
        float[] values = new float[parts.length - parts.length % 2];
        try {
            for (int i = 0; i < values.length; i++) {
                values[i] = Float.parseFloat(parts[i]);
            }
        } catch (NumberFormatException ex) {
            return false;
        }
        for (int i = 0; i < values.length; i += 2) {
            if (i == 0) {
                s.moveTo(m.x(values[i]), m.y(values[i + 1]));
            } else {
                s.lineTo(m.x(values[i]), m.y(values[i + 1]));
            }
        }
        return true;
    }

    /** 解釈した path を一旦ためておき、最後まで読めたときだけ書き出す。 */
    private static final class RecordingSink implements SvgPathParser.PathSink {
        private final List<float[]> ops = new ArrayList<>();

        @Override
        public void moveTo(float x, float y) {
            ops.add(new float[] { 0, x, y });
        }

        @Override
        public void lineTo(float x, float y) {
            ops.add(new float[] { 1, x, y });
        }

        @Override
        public void curveTo(float x1, float y1, float x2, float y2, float x, float y) {
            ops.add(new float[] { 2, x1, y1, x2, y2, x, y });
        }

        @Override
        public void closePath() {
            ops.add(new float[] { 3 });
        }

        boolean isEmpty() {
            return ops.isEmpty();
        }

        void replay(SvgPathParser.PathSink target) throws IOException {
            for (float[] op : ops) {
                switch ((int) op[0]) {
                    case 0 -> target.moveTo(op[1], op[2]);
                    case 1 -> target.lineTo(op[1], op[2]);
                    case 2 -> target.curveTo(op[1], op[2], op[3], op[4], op[5], op[6]);
                    default -> target.closePath();
                }
            }
        }
    }

    /** viewBox の座標を PDF の座標（左下原点）へ移す。 */
    private record Mapper(float offsetX, float offsetY, float scale) {
        float x(float vx) {
            return offsetX + vx * scale;
        }

        float y(float vy) {
            return offsetY - vy * scale;
        }
    }

    private record StreamSink(PDPageContentStream stream, Mapper m) implements SvgPathParser.PathSink {
        @Override
        public void moveTo(float x, float y) throws IOException {
            stream.moveTo(m.x(x), m.y(y));
        }

        @Override
        public void lineTo(float x, float y) throws IOException {
            stream.lineTo(m.x(x), m.y(y));
        }

        @Override
        public void curveTo(float x1, float y1, float x2, float y2, float x, float y) throws IOException {
            stream.curveTo(m.x(x1), m.y(y1), m.x(x2), m.y(y2), m.x(x), m.y(y));
        }

        @Override
        public void closePath() throws IOException {
            stream.closePath();
        }
    }
}
