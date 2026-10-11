package jp.tubeboard.features.lives.venueform.lines;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.springframework.stereotype.Component;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.AssetInspector;
import jp.tubeboard.features.lives.asset.AssetRasterizer;
import jp.tubeboard.features.lives.asset.LiveAsset;
import lombok.RequiredArgsConstructor;

/**
 * 背景ファイルの 1 ページから罫線を検出する。
 * PDF は描かれている線を直接読み、線が見つからない（スキャンした PDF など）か回転したページは画像にして検出する。
 */
@Component
@RequiredArgsConstructor
public class PageLineDetector {

    /** 検出方法を変えたら上げる。保存済みの古い結果は読むときに検出し直す。 */
    public static final int ALGORITHM_VERSION = 1;
    /** PDF の中の線がこれより少なければ、線は画像として描かれているとみなす。 */
    private static final int MIN_VECTOR_LINES = 4;
    private static final float RASTER_DPI = 150f;

    private final AssetRasterizer rasterizer;

    public List<RuledLine> detect(LiveAsset asset, int pageIndex) {
        if (AssetInspector.PDF.equals(asset.getContentType())) {
            List<RuledLine> vector = vectorLines(asset, pageIndex);
            if (vector.size() >= MIN_VECTOR_LINES) return vector;
        }
        return RasterLineDetector.detect(rasterizer.pageImage(asset, pageIndex, RASTER_DPI));
    }

    private static List<RuledLine> vectorLines(LiveAsset asset, int pageIndex) {
        try (PDDocument doc = Loader.loadPDF(asset.getContent())) {
            if (pageIndex < 0 || pageIndex >= doc.getNumberOfPages()) {
                throw new BadRequestException("ページが見つかりません");
            }
            PDPage page = doc.getPage(pageIndex);
            if (page.getRotation() % 360 != 0) return List.of();
            return VectorLineExtractor.extract(page);
        } catch (IOException ex) {
            throw new UncheckedIOException("PDFを読み込めませんでした", ex);
        }
    }
}
