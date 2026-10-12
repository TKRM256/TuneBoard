package jp.tubeboard.features.lives.venueform.render;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.LayerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.util.Matrix;

import jp.tubeboard.features.lives.asset.AssetInspector;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.PageBackground;

/**
 * ページの背景（会場の書式）を描く。PDF はベクターのまま取り込み、画像は縦横比を保ってページに収める。
 * 取り込んだ PDF は出力先を保存し終えるまで開いておく必要があるので、使い終わったら close する。
 */
final class BackgroundDrawer implements AutoCloseable {

    private static final float ROTATED_PAGE_DPI = 200f;

    private final Map<UUID, LiveAsset> backgrounds;
    private final Map<UUID, PDDocument> openedSources = new HashMap<>();
    private final Map<UUID, PDImageXObject> images = new HashMap<>();

    BackgroundDrawer(Map<UUID, LiveAsset> backgrounds) {
        this.backgrounds = backgrounds;
    }

    void draw(PDPageContentStream stream, PDDocument pdf, PageBackground background, PDRectangle pageSize,
            RenderWarnings warnings, int pageNumber) throws IOException {
        if (background == null || background.assetId() == null) {
            return;
        }
        LiveAsset asset = backgrounds.get(background.assetId());
        if (asset == null) {
            warnings.add(pageNumber, "背景のファイルが見つかりません");
            return;
        }
        int pageIndex = background.pageIndex() == null ? 0 : background.pageIndex();
        if (AssetInspector.PDF.equals(asset.getContentType())) {
            PDDocument source = openedSources.get(asset.getId());
            if (source == null) {
                source = Loader.loadPDF(asset.getContent());
                openedSources.put(asset.getId(), source);
            }
            if (pageIndex >= source.getNumberOfPages()) {
                warnings.add(pageNumber, "背景のページが見つかりません");
                return;
            }
            if (source.getPage(pageIndex).getRotation() % 360 != 0) {
                // 回転指定のあるページは LayerUtility では縦横がずれるので、画像にして貼る
                BufferedImage raster = new PDFRenderer(source).renderImageWithDPI(pageIndex, ROTATED_PAGE_DPI);
                PDImageXObject image = LosslessFactory.createFromImage(pdf, raster);
                float[] fitted = fit(image.getWidth(), image.getHeight(), pageSize);
                stream.drawImage(image, fitted[0], fitted[1], image.getWidth() * fitted[2],
                        image.getHeight() * fitted[2]);
                return;
            }
            // 取り込んだフォームは切り抜き範囲の左下が原点に来るよう変換済みなので、大きさだけ合わせて置く
            PDFormXObject form = new LayerUtility(pdf).importPageAsForm(source, pageIndex);
            PDRectangle bbox = form.getBBox();
            float[] fitted = fit(bbox.getWidth(), bbox.getHeight(), pageSize);
            stream.saveGraphicsState();
            stream.transform(new Matrix(fitted[2], 0, 0, fitted[2], fitted[0], fitted[1]));
            stream.drawForm(form);
            stream.restoreGraphicsState();
            return;
        }
        PDImageXObject image = images.get(asset.getId());
        if (image == null) {
            image = PDImageXObject.createFromByteArray(pdf, asset.getContent(), asset.getFileName());
            images.put(asset.getId(), image);
        }
        float[] fitted = fit(image.getWidth(), image.getHeight(), pageSize);
        stream.drawImage(image, fitted[0], fitted[1], image.getWidth() * fitted[2], image.getHeight() * fitted[2]);
    }

    /** 縦横比を保ってページに収める。戻り値は {左, 下, 倍率}。 */
    static float[] fit(float width, float height, PDRectangle page) {
        float scale = Math.min(page.getWidth() / width, page.getHeight() / height);
        float left = (page.getWidth() - width * scale) / 2f;
        float bottom = (page.getHeight() - height * scale) / 2f;
        return new float[] { left, bottom, scale };
    }

    @Override
    public void close() throws IOException {
        for (PDDocument source : openedSources.values()) {
            source.close();
        }
        openedSources.clear();
    }
}
