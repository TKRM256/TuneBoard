package jp.tubeboard.features.lives.stageplot.icon;

import java.io.IOException;

/**
 * SVG の path の {@code d} 属性を解釈し、直線と 3 次ベジェ曲線だけで {@link PathSink} に流す。
 * 2 次ベジェと円弧は 3 次ベジェに変換する。lucide のアイコンを PDF に描くために使う。
 */
public final class SvgPathParser {

    /** 曲線の書き出し先。座標は SVG の座標系のまま渡す。 */
    public interface PathSink {
        void moveTo(float x, float y) throws IOException;

        void lineTo(float x, float y) throws IOException;

        void curveTo(float x1, float y1, float x2, float y2, float x, float y) throws IOException;

        void closePath() throws IOException;
    }

    private final String d;
    private final PathSink sink;
    private int pos;
    private float cx;
    private float cy;
    private float startX;
    private float startY;
    /** 直前の曲線の制御点（S / T の反射に使う）。 */
    private float lastCtrlX;
    private float lastCtrlY;
    private char lastCommand;

    private SvgPathParser(String d, PathSink sink) {
        this.d = d;
        this.sink = sink;
    }

    public static void parse(String d, PathSink sink) throws IOException {
        if (d == null || d.isBlank()) {
            return;
        }
        new SvgPathParser(d, sink).run();
    }

    private void run() throws IOException {
        char command = 0;
        while (true) {
            skipSeparators();
            if (pos >= d.length()) {
                return;
            }
            char c = d.charAt(pos);
            if (Character.isLetter(c)) {
                command = c;
                pos++;
            } else if (command == 0) {
                throw new IllegalArgumentException("path must start with a command");
            } else if (command == 'M') {
                command = 'L'; // 続く座標の組は直線として扱う
            } else if (command == 'm') {
                command = 'l';
            }
            execute(command);
            if (command == 'Z' || command == 'z') {
                command = 0;
            }
        }
    }

    private void execute(char command) throws IOException {
        boolean rel = Character.isLowerCase(command);
        float ox = rel ? cx : 0f;
        float oy = rel ? cy : 0f;
        switch (Character.toUpperCase(command)) {
            case 'M' -> {
                cx = ox + number();
                cy = oy + number();
                startX = cx;
                startY = cy;
                sink.moveTo(cx, cy);
            }
            case 'L' -> line(ox + number(), oy + number());
            case 'H' -> line(ox + number(), cy);
            case 'V' -> line(cx, oy + number());
            case 'C' -> {
                float x1 = ox + number(), y1 = oy + number();
                float x2 = ox + number(), y2 = oy + number();
                cubic(x1, y1, x2, y2, ox + number(), oy + number());
            }
            case 'S' -> {
                float[] r = reflected("CS");
                float x2 = ox + number(), y2 = oy + number();
                cubic(r[0], r[1], x2, y2, ox + number(), oy + number());
            }
            case 'Q' -> {
                float qx = ox + number(), qy = oy + number();
                quad(qx, qy, ox + number(), oy + number());
            }
            case 'T' -> {
                float[] r = reflected("QT");
                quad(r[0], r[1], ox + number(), oy + number());
            }
            case 'A' -> {
                float rx = number(), ry = number(), rotation = number();
                boolean largeArc = flag(), sweep = flag();
                arc(rx, ry, rotation, largeArc, sweep, ox + number(), oy + number());
            }
            case 'Z' -> {
                sink.closePath();
                cx = startX;
                cy = startY;
            }
            default -> throw new IllegalArgumentException("unsupported path command: " + command);
        }
        lastCommand = Character.toUpperCase(command);
    }

    private void line(float x, float y) throws IOException {
        sink.lineTo(x, y);
        cx = x;
        cy = y;
    }

    private void cubic(float x1, float y1, float x2, float y2, float x, float y) throws IOException {
        sink.curveTo(x1, y1, x2, y2, x, y);
        lastCtrlX = x2;
        lastCtrlY = y2;
        cx = x;
        cy = y;
    }

    private void quad(float qx, float qy, float x, float y) throws IOException {
        sink.curveTo(cx + 2f / 3f * (qx - cx), cy + 2f / 3f * (qy - cy),
                x + 2f / 3f * (qx - x), y + 2f / 3f * (qy - y), x, y);
        lastCtrlX = qx;
        lastCtrlY = qy;
        cx = x;
        cy = y;
    }

    /** 直前が同じ種類の曲線なら、その制御点を現在点で反転した点。そうでなければ現在点。 */
    private float[] reflected(String sameFamily) {
        if (sameFamily.indexOf(lastCommand) >= 0) {
            return new float[] { 2 * cx - lastCtrlX, 2 * cy - lastCtrlY };
        }
        return new float[] { cx, cy };
    }

    /** SVG 仕様（F.6）の端点表記から中心表記に直し、90 度以下の区間ごとに 3 次ベジェで近似する。 */
    private void arc(float rxIn, float ryIn, float rotationDeg, boolean largeArc, boolean sweep, float x, float y)
            throws IOException {
        if (rxIn == 0 || ryIn == 0 || (x == cx && y == cy)) {
            line(x, y);
            return;
        }
        double rx = Math.abs(rxIn);
        double ry = Math.abs(ryIn);
        double phi = Math.toRadians(rotationDeg);
        double cosPhi = Math.cos(phi);
        double sinPhi = Math.sin(phi);
        double dx = (cx - x) / 2.0;
        double dy = (cy - y) / 2.0;
        double x1p = cosPhi * dx + sinPhi * dy;
        double y1p = -sinPhi * dx + cosPhi * dy;
        double lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
        if (lambda > 1) {
            rx *= Math.sqrt(lambda);
            ry *= Math.sqrt(lambda);
        }
        double num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
        double den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
        double coef = Math.sqrt(Math.max(0, num / den)) * (largeArc == sweep ? -1 : 1);
        double cxp = coef * rx * y1p / ry;
        double cyp = -coef * ry * x1p / rx;
        double centerX = cosPhi * cxp - sinPhi * cyp + (cx + x) / 2.0;
        double centerY = sinPhi * cxp + cosPhi * cyp + (cy + y) / 2.0;
        double theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
        double delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
        if (!sweep && delta > 0) {
            delta -= 2 * Math.PI;
        } else if (sweep && delta < 0) {
            delta += 2 * Math.PI;
        }
        int segments = (int) Math.ceil(Math.abs(delta) / (Math.PI / 2));
        double step = delta / segments;
        double t = 4.0 / 3.0 * Math.tan(step / 4);
        double theta = theta1;
        for (int i = 0; i < segments; i++) {
            double cos1 = Math.cos(theta), sin1 = Math.sin(theta);
            double cos2 = Math.cos(theta + step), sin2 = Math.sin(theta + step);
            double[] p1 = ellipsePoint(centerX, centerY, rx, ry, cosPhi, sinPhi, cos1 - t * sin1, sin1 + t * cos1);
            double[] p2 = ellipsePoint(centerX, centerY, rx, ry, cosPhi, sinPhi, cos2 + t * sin2, sin2 - t * cos2);
            double[] p = ellipsePoint(centerX, centerY, rx, ry, cosPhi, sinPhi, cos2, sin2);
            boolean last = i == segments - 1;
            cubic((float) p1[0], (float) p1[1], (float) p2[0], (float) p2[1],
                    last ? x : (float) p[0], last ? y : (float) p[1]);
            theta += step;
        }
    }

    private static double[] ellipsePoint(double centerX, double centerY, double rx, double ry, double cosPhi,
            double sinPhi, double ux, double uy) {
        double px = rx * ux;
        double py = ry * uy;
        return new double[] { cosPhi * px - sinPhi * py + centerX, sinPhi * px + cosPhi * py + centerY };
    }

    private static double angle(double ux, double uy, double vx, double vy) {
        double dot = ux * vx + uy * vy;
        double len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
        double a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
        return (ux * vy - uy * vx) < 0 ? -a : a;
    }

    private boolean flag() {
        skipSeparators();
        if (pos >= d.length() || (d.charAt(pos) != '0' && d.charAt(pos) != '1')) {
            throw new IllegalArgumentException("invalid arc flag");
        }
        return d.charAt(pos++) == '1';
    }

    private float number() {
        skipSeparators();
        int start = pos;
        if (pos < d.length() && (d.charAt(pos) == '-' || d.charAt(pos) == '+')) {
            pos++;
        }
        boolean dot = false;
        while (pos < d.length()) {
            char c = d.charAt(pos);
            if (Character.isDigit(c)) {
                pos++;
            } else if (c == '.' && !dot) {
                dot = true;
                pos++;
            } else if ((c == 'e' || c == 'E') && pos > start) {
                pos++;
                if (pos < d.length() && (d.charAt(pos) == '-' || d.charAt(pos) == '+')) {
                    pos++;
                }
            } else {
                break;
            }
        }
        if (start == pos) {
            throw new IllegalArgumentException("number expected at " + pos);
        }
        return Float.parseFloat(d.substring(start, pos));
    }

    private void skipSeparators() {
        while (pos < d.length() && (Character.isWhitespace(d.charAt(pos)) || d.charAt(pos) == ',')) {
            pos++;
        }
    }
}
