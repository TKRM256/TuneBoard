package jp.tubeboard.features.lives.venueform.lines;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

import java.io.IOException;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.Test;

/** PDF に描かれた線の読み取り。A4（595×842pt）のページに描いて確かめる。 */
class VectorLineExtractorTest {

    private static final float PAGE_W = PDRectangle.A4.getWidth();
    private static final float PAGE_H = PDRectangle.A4.getHeight();

    @Test
    void セルごとに分かれた罫線を1本にまとめ左上基準の比率で返す() throws IOException {
        List<RuledLine> lines = extract(content -> {
            content.setLineWidth(0.5f);
            // 表計算ソフトのように、横線をセルの幅ごとに分けて描く
            for (int cell = 0; cell < 4; cell++) {
                content.moveTo(100 + cell * 50, 700);
                content.lineTo(150 + cell * 50, 700);
            }
            content.stroke();
        });

        assertThat(lines).singleElement().satisfies(line -> {
            assertThat(line.axis()).isEqualTo(RuledLine.HORIZONTAL);
            assertThat(line.pos()).isCloseTo((PAGE_H - 700) / PAGE_H, offset(0.001));
            assertThat(line.from()).isCloseTo(100 / PAGE_W, offset(0.001));
            assertThat(line.to()).isCloseTo(300 / PAGE_W, offset(0.001));
        });
    }

    @Test
    void 四角の枠は4辺の線になる() throws IOException {
        List<RuledLine> lines = extract(content -> {
            content.addRect(100, 500, 200, 100);
            content.stroke();
        });

        assertThat(lines).hasSize(4);
        assertThat(lines).filteredOn(l -> l.axis().equals(RuledLine.VERTICAL)).hasSize(2);
    }

    @Test
    void 細長い塗りつぶしは罫線とみなし太い塗りは除く() throws IOException {
        List<RuledLine> lines = extract(content -> {
            content.addRect(100, 400, 300, 1);
            content.addRect(100, 300, 300, 40);
            content.fill();
        });

        assertThat(lines).singleElement()
                .satisfies(line -> assertThat(line.pos()).isCloseTo((PAGE_H - 400.5) / PAGE_H, offset(0.001)));
    }

    @Test
    void 白い線や斜めの線や曲線は除く() throws IOException {
        List<RuledLine> lines = extract(content -> {
            content.setStrokingColor(1f, 1f, 1f);
            content.moveTo(100, 600);
            content.lineTo(400, 600);
            content.stroke();
            content.setStrokingColor(0f, 0f, 0f);
            content.moveTo(100, 100);
            content.lineTo(400, 300);
            content.curveTo(450, 350, 500, 350, 550, 300);
            content.stroke();
        });

        assertThat(lines).isEmpty();
    }

    private interface Drawing {
        void draw(PDPageContentStream content) throws IOException;
    }

    private static List<RuledLine> extract(Drawing drawing) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
                drawing.draw(content);
            }
            return VectorLineExtractor.extract(page);
        }
    }
}
