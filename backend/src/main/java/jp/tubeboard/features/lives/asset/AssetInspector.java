package jp.tubeboard.features.lives.asset;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Component;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.AssetMeta.AssetPage;

/**
 * アップロードされたファイルの種類を中身から判定し、読み込めるか・大きすぎないかを確かめる。
 * 拡張子や Content-Type は偽れるので信用しない。
 */
@Component
public class AssetInspector {

    public static final String PDF = "application/pdf";
    public static final String PNG = "image/png";
    public static final String JPEG = "image/jpeg";

    static final long MAX_BYTES = 5L * 1024 * 1024;
    static final int MAX_PDF_PAGES = 20;
    /** 展開すると巨大になる画像（いわゆる画像爆弾）を読み込まないための上限。 */
    static final long MAX_IMAGE_PIXELS = 40_000_000L;
    private static final float PT_TO_MM = 25.4f / 72f;

    public record Inspection(String contentType, AssetMeta meta) {
    }

    public Inspection inspect(byte[] bytes, boolean allowPdf) {
        if (bytes == null || bytes.length == 0) {
            throw new BadRequestException("ファイルが空です");
        }
        if (bytes.length > MAX_BYTES) {
            throw new BadRequestException("ファイルは5MB以下にしてください");
        }
        String type = detectType(bytes);
        if (type == null || (PDF.equals(type) && !allowPdf)) {
            throw new BadRequestException(allowPdf
                    ? "PDF・PNG・JPEG のファイルを選んでください"
                    : "PNG・JPEG の画像を選んでください");
        }
        AssetMeta meta = PDF.equals(type) ? inspectPdf(bytes) : inspectImage(bytes);
        return new Inspection(type, meta);
    }

    static String detectType(byte[] b) {
        if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') {
            return PDF;
        }
        if (b.length >= 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return PNG;
        }
        if (b.length >= 3 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8 && (b[2] & 0xff) == 0xFF) {
            return JPEG;
        }
        return null;
    }

    private AssetMeta inspectPdf(byte[] bytes) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            int count = doc.getNumberOfPages();
            if (count == 0) {
                throw new BadRequestException("ページの無いPDFは使えません");
            }
            if (count > MAX_PDF_PAGES) {
                throw new BadRequestException("PDFは" + MAX_PDF_PAGES + "ページまでにしてください");
            }
            List<AssetPage> pages = new ArrayList<>(count);
            for (PDPage page : doc.getPages()) {
                PDRectangle box = page.getCropBox();
                boolean rotated = page.getRotation() % 180 != 0;
                float w = rotated ? box.getHeight() : box.getWidth();
                float h = rotated ? box.getWidth() : box.getHeight();
                pages.add(new AssetPage(round1(w * PT_TO_MM), round1(h * PT_TO_MM), null, null));
            }
            return new AssetMeta(List.copyOf(pages));
        } catch (IOException ex) {
            throw new BadRequestException("PDFを読み込めませんでした（パスワード付き・破損したファイルは使えません）");
        }
    }

    private AssetMeta inspectImage(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new BadRequestException("画像を読み込めませんでした");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long) width * height > MAX_IMAGE_PIXELS) {
                    throw new BadRequestException("画像の縦横の大きさが大きすぎます");
                }
                return new AssetMeta(List.of(new AssetPage(null, null, width, height)));
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new BadRequestException("画像を読み込めませんでした");
        }
    }

    private static float round1(float v) {
        return Math.round(v * 10f) / 10f;
    }
}
