package jp.tubeboard.features.lives.venueform.lines;

import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

import jp.tubeboard.features.lives.venueform.lines.LineSegments.Segment;

/**
 * 画像（スキャンした書式や、書式を画像にしたもの）から縦横の罫線を検出する。傾いた画像は対象外。
 *
 * <p>
 * 暗い画素が細い帯になって長く続くところを線とみなす。文字は途切れが多く短いので、
 * 塗りつぶしは帯が太いので除かれる。R・G・B のどれもが暗い画素だけを数えるので、
 * 赤い書き込みや黄色の帯などの色付きの部分は線にならない。
 * 画像の解像度は分からないので、長辺を A4 の長辺（297mm）とみなして mm を見積もる。
 */
public final class RasterLineDetector {

    private static final double ASSUMED_LONG_SIDE_MM = 297;
    /** これより明るい画素（どれかのチャンネルがこれ以上）は線にしない。 */
    private static final int DARK_MAX = 150;
    private static final double MIN_LENGTH_MM = 6;
    /** かすれ・JPEG のノイズで途切れても同じ線とみなす長さ。 */
    private static final double GAP_MM = 0.35;
    private static final double MAX_THICKNESS_MM = 1.2;
    /** 線の範囲のうち、暗い画素が占める割合の下限。 */
    private static final double MIN_FILL = 0.8;
    /** 線の外側を調べる距離。文字の横画は、この距離の上下にも字の一部（縦画など）がある。 */
    private static final double NEIGHBOR_MM = 0.5;
    /** 線の外側の行で暗い画素がこの割合を超えると、文字の一部とみなす（平行な別の線は除く）。 */
    private static final double MAX_NEIGHBOR_FILL = 0.25;
    private static final double PARALLEL_LINE_FILL = 0.85;
    private static final double MERGE_POS_MM = 0.6;
    private static final double MERGE_GAP_MM = 1.0;

    private RasterLineDetector() {
    }

    public static List<RuledLine> detect(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        double pxPerMm = Math.max(1, Math.max(width, height) / ASSUMED_LONG_SIDE_MM);
        boolean[] dark = darkMask(image);

        List<Segment> segments = new ArrayList<>();
        segments.addAll(scan(dark, width, height, true, pxPerMm));
        segments.addAll(scan(dark, width, height, false, pxPerMm));
        List<Segment> merged = LineSegments.merge(segments, MERGE_POS_MM * pxPerMm, MERGE_GAP_MM * pxPerMm);
        return LineSegments.normalize(merged, width, height);
    }

    private static boolean[] darkMask(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        if (image.getRaster().getNumBands() == 1) {
            // グレースケール（スキャナーの白黒 JPEG など）は getRGB を通すと色空間の変換で中間の灰色が明るくなり、
            // 細い線が暗い画素として数えられなくなるので、画素の値をそのまま読む
            int[] gray = image.getRaster().getSamples(0, 0, width, height, 0, (int[]) null);
            int maxValue = (1 << image.getColorModel().getComponentSize(0)) - 1;
            boolean[] dark = new boolean[gray.length];
            for (int i = 0; i < gray.length; i++) {
                dark[i] = gray[i] * 255 / maxValue < DARK_MAX;
            }
            return dark;
        }
        int[] argb = image.getRGB(0, 0, width, height, null, 0, width);
        boolean[] dark = new boolean[argb.length];
        for (int i = 0; i < argb.length; i++) {
            int pixel = argb[i];
            int alpha = pixel >>> 24;
            int max = Math.max((pixel >> 16) & 0xff, Math.max((pixel >> 8) & 0xff, pixel & 0xff));
            dark[i] = alpha >= 128 && max < DARK_MAX;
        }
        return dark;
    }

    /** horizontal なら横線、そうでなければ縦線を探す（縦は縦横を入れ替えて同じ処理をする）。 */
    private static List<Segment> scan(boolean[] dark, int width, int height, boolean horizontal, double pxPerMm) {
        int lines = horizontal ? height : width;
        int length = horizontal ? width : height;
        int gap = Math.max(1, (int) Math.round(GAP_MM * pxPerMm));
        int minLength = (int) Math.ceil(MIN_LENGTH_MM * pxPerMm);
        int maxThickness = Math.max(2, (int) Math.round(MAX_THICKNESS_MM * pxPerMm));
        int neighbor = Math.max(2, (int) Math.round(NEIGHBOR_MM * pxPerMm));

        BandBuilder bands = new BandBuilder();
        for (int line = 0; line < lines; line++) {
            for (int[] run : runs(dark, width, line, length, horizontal, gap, minLength)) {
                bands.add(line, run[0], run[1]);
            }
            bands.closeBefore(line);
        }
        bands.closeBefore(Integer.MAX_VALUE);

        String axis = horizontal ? RuledLine.HORIZONTAL : RuledLine.VERTICAL;
        List<Segment> out = new ArrayList<>();
        for (Band band : bands.closed) {
            if (band.thickness() > maxThickness) continue;
            if (looksLikeText(dark, width, lines, horizontal, band, neighbor)) continue;
            out.add(new Segment(axis, (band.first + band.last + 1) / 2.0, band.from, band.to + 1));
        }
        return out;
    }

    /**
     * 線の少し外側の行（縦線なら列）に暗い画素が多ければ、文字の横画（縦画）とみなす。
     * 罫線の外側には、交わる線や近くの文字が少しあるだけなので割合は小さい。
     * ほぼ埋まっている行は平行な別の罫線（二重線）なので文字扱いしない。
     */
    private static boolean looksLikeText(boolean[] dark, int width, int lines, boolean horizontal, Band band,
            int neighbor) {
        for (int line : new int[] { band.first - neighbor, band.last + neighbor }) {
            if (line < 0 || line >= lines) continue;
            int count = 0;
            for (int i = band.from; i <= band.to; i++) {
                if (dark[horizontal ? line * width + i : i * width + line]) count++;
            }
            double fill = (double) count / (band.to - band.from + 1);
            if (fill > MAX_NEIGHBOR_FILL && fill < PARALLEL_LINE_FILL) return true;
        }
        return false;
    }

    /** 1 行（縦線なら 1 列）の中で、短い途切れを許して暗い画素が続く範囲。長さと濃さの足りないものは捨てる。 */
    private static List<int[]> runs(boolean[] dark, int width, int line, int length, boolean horizontal,
            int gap, int minLength) {
        List<int[]> out = new ArrayList<>();
        int start = -1;
        int lastDark = -1;
        int count = 0;
        for (int i = 0; i <= length; i++) {
            boolean isDark = i < length && dark[horizontal ? line * width + i : i * width + line];
            if (isDark) {
                if (start < 0 || i - lastDark > gap + 1) {
                    keepIfLine(out, start, lastDark, count, minLength);
                    start = i;
                    count = 0;
                }
                lastDark = i;
                count++;
            }
        }
        keepIfLine(out, start, lastDark, count, minLength);
        return out;
    }

    private static void keepIfLine(List<int[]> out, int start, int end, int count, int minLength) {
        if (start < 0) return;
        int length = end - start + 1;
        if (length >= minLength && count >= length * MIN_FILL) {
            out.add(new int[] { start, end });
        }
    }

    /** 隣り合う行で重なっている範囲をまとめ、線の太さ（帯）として扱う。 */
    private static final class Band {
        final int first;
        int last;
        int from;
        int to;

        Band(int line, int from, int to) {
            this.first = line;
            this.last = line;
            this.from = from;
            this.to = to;
        }

        int thickness() {
            return last - first + 1;
        }

        boolean overlaps(int otherFrom, int otherTo) {
            int overlap = Math.min(to, otherTo) - Math.max(from, otherFrom) + 1;
            int shorter = Math.min(to - from, otherTo - otherFrom) + 1;
            return overlap * 2 >= shorter;
        }
    }

    private static final class BandBuilder {
        private final List<Band> open = new ArrayList<>();
        final List<Band> closed = new ArrayList<>();

        void add(int line, int from, int to) {
            for (Band band : open) {
                if (band.last == line - 1 && band.overlaps(from, to)) {
                    band.last = line;
                    band.from = Math.min(band.from, from);
                    band.to = Math.max(band.to, to);
                    return;
                }
            }
            open.add(new Band(line, from, to));
        }

        /** この行で伸びなかった帯を閉じる。 */
        void closeBefore(int line) {
            open.removeIf(band -> {
                if (band.last < line) {
                    closed.add(band);
                    return true;
                }
                return false;
            });
        }
    }
}
