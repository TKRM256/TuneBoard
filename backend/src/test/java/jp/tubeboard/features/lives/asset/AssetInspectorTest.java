package jp.tubeboard.features.lives.asset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.Test;

import jp.tubeboard.common.exception.BadRequestException;

class AssetInspectorTest {

    private final AssetInspector inspector = new AssetInspector();

    static byte[] pdf(int pages, PDRectangle size) throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (int i = 0; i < pages; i++) {
                doc.addPage(new PDPage(size));
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    static byte[] png(int width, int height) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", out);
            return out.toByteArray();
        }
    }

    @Test
    void PDFはページ数と大きさを読み取る() throws IOException {
        AssetInspector.Inspection result = inspector.inspect(pdf(2, PDRectangle.A4), true);

        assertThat(result.contentType()).isEqualTo(AssetInspector.PDF);
        assertThat(result.meta().pageCount()).isEqualTo(2);
        assertThat(result.meta().pages().get(0).widthMm()).isEqualTo(210f);
        assertThat(result.meta().pages().get(0).heightMm()).isEqualTo(297f);
    }

    @Test
    void 画像はピクセルの大きさを読み取る() throws IOException {
        AssetInspector.Inspection result = inspector.inspect(png(320, 200), false);

        assertThat(result.contentType()).isEqualTo(AssetInspector.PNG);
        assertThat(result.meta().pages().get(0).widthPx()).isEqualTo(320);
        assertThat(result.meta().pages().get(0).heightPx()).isEqualTo(200);
    }

    @Test
    void 拡張子ではなく中身で種類を判定する() {
        assertThatThrownBy(() -> inspector.inspect("<html>not a pdf</html>".getBytes(), true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PDF・PNG・JPEG");
    }

    @Test
    void 下絵にはPDFを使えない() throws IOException {
        byte[] bytes = pdf(1, PDRectangle.A4);
        assertThatThrownBy(() -> inspector.inspect(bytes, false))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PNG・JPEG");
    }

    @Test
    void ページが多すぎるPDFや壊れたPDFは弾く() throws IOException {
        byte[] many = pdf(AssetInspector.MAX_PDF_PAGES + 1, PDRectangle.A6);
        assertThatThrownBy(() -> inspector.inspect(many, true)).hasMessageContaining("ページまで");
        assertThatThrownBy(() -> inspector.inspect("%PDF-1.7 broken".getBytes(), true))
                .hasMessageContaining("読み込めません");
    }

    @Test
    void 空や大きすぎるファイルは弾く() {
        assertThatThrownBy(() -> inspector.inspect(new byte[0], true)).hasMessageContaining("空");
        byte[] huge = new byte[(int) AssetInspector.MAX_BYTES + 1];
        huge[0] = '%';
        assertThatThrownBy(() -> inspector.inspect(huge, true)).hasMessageContaining("5MB");
    }
}
