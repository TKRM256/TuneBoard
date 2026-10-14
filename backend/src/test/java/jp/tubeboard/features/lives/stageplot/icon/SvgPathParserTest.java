package jp.tubeboard.features.lives.stageplot.icon;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

class SvgPathParserTest {

    /** 受け取った命令を文字列で記録する。 */
    private static final class Recorder implements SvgPathParser.PathSink {
        final List<String> ops = new ArrayList<>();

        @Override
        public void moveTo(float x, float y) {
            ops.add("M" + fmt(x) + "," + fmt(y));
        }

        @Override
        public void lineTo(float x, float y) {
            ops.add("L" + fmt(x) + "," + fmt(y));
        }

        @Override
        public void curveTo(float x1, float y1, float x2, float y2, float x, float y) {
            ops.add("C" + fmt(x) + "," + fmt(y));
        }

        @Override
        public void closePath() {
            ops.add("Z");
        }

        private static String fmt(float v) {
            return String.valueOf(Math.round(v * 100) / 100f);
        }
    }

    private static List<String> parse(String d) throws Exception {
        Recorder recorder = new Recorder();
        SvgPathParser.parse(d, recorder);
        return recorder.ops;
    }

    @Test
    void 絶対座標と相対座標の直線を解釈できる() throws Exception {
        assertThat(parse("M2 3 L10 3 l0 4 H2 v-4 z"))
                .containsExactly("M2.0,3.0", "L10.0,3.0", "L10.0,7.0", "L2.0,7.0", "L2.0,3.0", "Z");
    }

    @Test
    void Mの後に続く座標は直線として扱う() throws Exception {
        assertThat(parse("m1 1 2 2 3 3")).containsExactly("M1.0,1.0", "L3.0,3.0", "L6.0,6.0");
    }

    @Test
    void 区切りの省略された数値を読み分ける() throws Exception {
        assertThat(parse("M0.5.5L-1-1")).containsExactly("M0.5,0.5", "L-1.0,-1.0");
    }

    @Test
    void 曲線は3次ベジェにして終点が合う() throws Exception {
        assertThat(parse("M0 0 C1 1 2 1 3 0 S5 -1 6 0 Q7 1 8 0 T10 0"))
                .containsExactly("M0.0,0.0", "C3.0,0.0", "C6.0,0.0", "C8.0,0.0", "C10.0,0.0");
    }

    @Test
    void 円弧は90度ごとのベジェに分けて終点に着く() throws Exception {
        // 半円 (180 度) は 2 本の曲線になる
        List<String> ops = parse("M2 12 a10 10 0 0 1 20 0");
        assertThat(ops).hasSize(3);
        assertThat(ops.get(ops.size() - 1)).isEqualTo("C22.0,12.0");
    }

    @Test
    void 詰めて書かれた円弧のフラグを読める() throws Exception {
        List<String> ops = parse("M2 12a10 10 0 0110 10");
        assertThat(ops.get(ops.size() - 1)).isEqualTo("C12.0,22.0");
    }

    @Test
    void 壊れたパスは例外にする() {
        assertThatThrownBy(() -> parse("M1 1 L")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parse("10 10")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parse("M0 0 X1 1")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 空のパスは何もしない() throws Exception {
        assertThat(parse("")).isEmpty();
        assertThat(parse(null)).isEmpty();
    }
}
