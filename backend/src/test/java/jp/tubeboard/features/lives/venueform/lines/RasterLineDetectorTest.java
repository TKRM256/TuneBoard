package jp.tubeboard.features.lives.venueform.lines;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.List;

import org.junit.jupiter.api.Test;

/** 画像からの罫線検出。A4（2100×2970px = 10px/mm）の画像に描いて確かめる。 */
class RasterLineDetectorTest {

    private static final int W = 2100;
    private static final int H = 2970;
    /** 1mm のピクセル数。 */
    private static final int MM = 10;

    @Test
    void 表の罫線を縦横とも1本ずつ検出する() {
        BufferedImage image = blank();
        Graphics2D g = pen(image, Color.BLACK, 3);
        // 横 4 本・縦 5 本の 3 行 4 列の表
        for (int row = 0; row <= 3; row++) g.drawLine(20 * MM, (50 + row * 10) * MM, 180 * MM, (50 + row * 10) * MM);
        for (int col = 0; col <= 4; col++) g.drawLine((20 + col * 40) * MM, 50 * MM, (20 + col * 40) * MM, 80 * MM);

        List<RuledLine> lines = RasterLineDetector.detect(image);

        assertThat(horizontal(lines)).hasSize(4);
        assertThat(vertical(lines)).hasSize(5);
        RuledLine top = horizontal(lines).stream().filter(l -> near(l.pos(), 50.0 / 297)).findFirst().orElseThrow();
        assertThat(top.from()).isCloseTo(20.0 / 210, within(1));
        assertThat(top.to()).isCloseTo(180.0 / 210, within(1));
    }

    @Test
    void かすれて途切れた線も1本につなぐ() {
        BufferedImage image = blank();
        Graphics2D g = pen(image, Color.BLACK, 2);
        for (int x = 20 * MM; x < 150 * MM; x += 3 * MM) g.drawLine(x, 100 * MM, x + 3 * MM - 3, 100 * MM);

        assertThat(horizontal(RasterLineDetector.detect(image))).singleElement()
                .satisfies(line -> assertThat(line.to() - line.from()).isGreaterThan(125.0 / 210));
    }

    @Test
    void 色付きの線や帯は罫線にしない() {
        BufferedImage image = blank();
        pen(image, new Color(230, 30, 30), 4).drawRect(30 * MM, 30 * MM, 100 * MM, 40 * MM);
        Graphics2D yellow = pen(image, new Color(250, 240, 120), 1);
        yellow.fillRect(30 * MM, 100 * MM, 120 * MM, 2);

        assertThat(RasterLineDetector.detect(image)).isEmpty();
    }

    @Test
    void 太い塗りつぶしは罫線にしない() {
        BufferedImage image = blank();
        pen(image, Color.BLACK, 1).fillRect(20 * MM, 40 * MM, 150 * MM, 5 * MM);

        assertThat(RasterLineDetector.detect(image)).isEmpty();
    }

    @Test
    void 太字の文字の画は罫線にしない() {
        BufferedImage image = blank();
        Graphics2D g = pen(image, Color.BLACK, 1);
        // 「四」のように、横画の上下に縦画がある太い字を並べる
        for (int i = 0; i < 6; i++) {
            int x = (20 + i * 9) * MM;
            int y = 60 * MM;
            g.fillRect(x, y, 8 * MM, 8);
            g.fillRect(x, y + 7 * MM, 8 * MM, 8);
            for (int stem = 0; stem < 4; stem++) g.fillRect(x + stem * 24, y, 8, 7 * MM + 8);
        }

        assertThat(horizontal(RasterLineDetector.detect(image))).isEmpty();
    }

    @Test
    void 文字の下の下線は罫線として残す() {
        BufferedImage image = blank();
        Graphics2D g = pen(image, Color.BLACK, 1);
        // ラベル（字のかたまり）のすぐ下に長い下線
        for (int i = 0; i < 3; i++) g.fillRect((22 + i * 5) * MM, 92 * MM, 4 * MM, 5 * MM);
        g.fillRect(20 * MM, 98 * MM, 120 * MM, 3);

        assertThat(horizontal(RasterLineDetector.detect(image))).singleElement()
                .satisfies(line -> assertThat(line.pos()).isCloseTo(98.15 / 297, within(1)));
    }

    @Test
    void 近い二重線はそれぞれ線として残す() {
        BufferedImage image = blank();
        Graphics2D g = pen(image, Color.BLACK, 1);
        g.fillRect(20 * MM, 50 * MM, 150 * MM, 3);
        g.fillRect(20 * MM, 50 * MM + 9, 150 * MM, 3);

        assertThat(horizontal(RasterLineDetector.detect(image))).hasSize(2);
    }

    @Test
    void 短い線は罫線にしない() {
        BufferedImage image = blank();
        pen(image, Color.BLACK, 3).drawLine(20 * MM, 50 * MM, 24 * MM, 50 * MM);

        assertThat(RasterLineDetector.detect(image)).isEmpty();
    }

    @Test
    void 透明な背景の画像も扱える() {
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        pen(image, Color.BLACK, 3).drawLine(20 * MM, 50 * MM, 150 * MM, 50 * MM);

        assertThat(RasterLineDetector.detect(image)).singleElement()
                .satisfies(line -> assertThat(line.axis()).isEqualTo(RuledLine.HORIZONTAL));
    }

    @Test
    void グレースケール画像の少し明るい線も検出する() {
        // スキャナーの白黒 JPEG のような 1 チャンネルの画像。値 100 の灰色は getRGB を通すと 150 より明るくなる
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_BYTE_GRAY);
        var raster = image.getRaster();
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) raster.setSample(x, y, 0, y == 100 * MM ? 100 : 245);
        }

        assertThat(horizontal(RasterLineDetector.detect(image))).singleElement()
                .satisfies(line -> assertThat(line.to() - line.from()).isGreaterThan(200.0 / 210));
    }

    private static BufferedImage blank() {
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, W, H);
        g.dispose();
        return image;
    }

    private static Graphics2D pen(BufferedImage image, Color color, float width) {
        Graphics2D g = image.createGraphics();
        g.setColor(color);
        g.setStroke(new BasicStroke(width));
        return g;
    }

    private static List<RuledLine> horizontal(List<RuledLine> lines) {
        return lines.stream().filter(l -> l.axis().equals(RuledLine.HORIZONTAL)).toList();
    }

    private static List<RuledLine> vertical(List<RuledLine> lines) {
        return lines.stream().filter(l -> l.axis().equals(RuledLine.VERTICAL)).toList();
    }

    private static boolean near(double value, double expected) {
        return Math.abs(value - expected) < 0.003;
    }

    /** mm 単位の許容差を、比率（A4 の長辺基準）の許容差にする。 */
    private static org.assertj.core.data.Offset<Double> within(double mm) {
        return org.assertj.core.data.Offset.offset(mm / 210);
    }
}
