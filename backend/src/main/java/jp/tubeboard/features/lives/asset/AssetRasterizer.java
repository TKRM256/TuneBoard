package jp.tubeboard.features.lives.asset;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;

import jp.tubeboard.common.exception.BadRequestException;

/** 背景ファイルのページを画像にする（エディタでの表示用・下絵の切り出し用）。 */
@Component
public class AssetRasterizer {

    private static final float PREVIEW_DPI = 110f;
    /** エディタで拡大したときの画質の段階。PREVIEW_DPI の何倍で描くか（大きいほどメモリを使うので 3 倍まで）。 */
    public static final int MAX_PREVIEW_QUALITY = 3;
    private static final float CROP_DPI = 200f;

    /** 範囲は画像全体に対する比率（0〜1）で指定する。 */
    public record CropRect(double x, double y, double width, double height) {
    }

    /**
     * エディタの背景として表示するページの画像。画像ファイルはそのまま返す。
     * PDF は拡大しても線がぼやけないよう、quality（1〜3）倍の解像度で描く。
     */
    public byte[] previewPng(LiveAsset asset, int pageIndex, int quality) {
        if (!AssetInspector.PDF.equals(asset.getContentType())) {
            return asset.getContent();
        }
        int level = clamp(quality, 1, MAX_PREVIEW_QUALITY);
        return toPng(renderPdfPage(asset.getContent(), pageIndex, PREVIEW_DPI * level));
    }

    public String previewContentType(LiveAsset asset) {
        return AssetInspector.PDF.equals(asset.getContentType()) ? AssetInspector.PNG : asset.getContentType();
    }

    /** ページの一部を切り出した PNG。ステージの下絵を会場書式から作るときに使う。 */
    public byte[] cropPng(LiveAsset asset, int pageIndex, CropRect rect) {
        validate(rect);
        BufferedImage source = AssetInspector.PDF.equals(asset.getContentType())
                ? renderPdfPage(asset.getContent(), pageIndex, CROP_DPI)
                : readImage(asset.getContent());
        int x = clamp((int) Math.floor(rect.x() * source.getWidth()), 0, source.getWidth() - 1);
        int y = clamp((int) Math.floor(rect.y() * source.getHeight()), 0, source.getHeight() - 1);
        int w = clamp((int) Math.ceil(rect.width() * source.getWidth()), 1, source.getWidth() - x);
        int h = clamp((int) Math.ceil(rect.height() * source.getHeight()), 1, source.getHeight() - y);
        return toPng(source.getSubimage(x, y, w, h));
    }

    private BufferedImage renderPdfPage(byte[] pdf, int pageIndex, float dpi) {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            if (pageIndex < 0 || pageIndex >= doc.getNumberOfPages()) {
                throw new BadRequestException("ページが見つかりません");
            }
            return new PDFRenderer(doc).renderImageWithDPI(pageIndex, dpi, ImageType.RGB);
        } catch (IOException ex) {
            throw new UncheckedIOException("PDFのページを画像にできませんでした", ex);
        }
    }

    private BufferedImage readImage(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw new BadRequestException("画像を読み込めませんでした");
            }
            return image;
        } catch (IOException ex) {
            throw new UncheckedIOException("画像を読み込めませんでした", ex);
        }
    }

    private static byte[] toPng(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException("画像の書き出しに失敗しました", ex);
        }
    }

    private static void validate(CropRect rect) {
        boolean valid = rect != null
                && Double.isFinite(rect.x()) && Double.isFinite(rect.y())
                && Double.isFinite(rect.width()) && Double.isFinite(rect.height())
                && rect.x() >= 0 && rect.y() >= 0 && rect.width() > 0.01 && rect.height() > 0.01
                && rect.x() + rect.width() <= 1.0001 && rect.y() + rect.height() <= 1.0001;
        if (!valid) {
            throw new BadRequestException("切り出す範囲が正しくありません");
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
