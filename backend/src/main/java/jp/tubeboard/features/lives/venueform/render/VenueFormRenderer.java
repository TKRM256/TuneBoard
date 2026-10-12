package jp.tubeboard.features.lives.venueform.render;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.LayerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.util.Matrix;

import jp.tubeboard.features.lives.asset.AssetInspector;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.export.context.CanvasContext;
import jp.tubeboard.features.lives.export.context.CanvasException;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.table.TableRows;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.stageplot.StagePlotAnswers;
import jp.tubeboard.features.lives.stageplot.StagePlotDrawer;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.stageplot.StagePlotValues;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.PageBackground;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;

/**
 * 会場書式を 1 件の提出で描く。背景の PDF はベクターのまま取り込み、その上に要素を重ねる。
 * 背景の PDF は出力先を保存し終えるまで開いておく必要があるので、使い終わったら close する。
 */
public final class VenueFormRenderer implements AutoCloseable {

    /** 描画に使うファイル類。権限を確かめたうえで呼び出し側が集める。 */
    public record Resources(Map<UUID, LiveAsset> backgrounds, StagePlotSettings stagePlot, LiveAsset stageBase) {
    }

    private static final float ROTATED_PAGE_DPI = 200f;

    private final ConditionEvaluator conditions;
    private final VenueElementDrawer elementDrawer;
    private final VenueTableDrawer tableDrawer;
    private final Resources resources;
    private final PublicSettingSheetSubmissionDetailResponse submission;
    private final Map<String, Object> namespace;
    private final Map<UUID, PDDocument> openedSources = new HashMap<>();
    private final Map<String, VenueTableDrawer.Coverage> coverages = new HashMap<>();
    private final Map<String, String> groupLabels = new HashMap<>();

    public VenueFormRenderer(ExpressionEvaluator evaluator, LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, Resources resources) {
        this.conditions = new ConditionEvaluator(evaluator);
        this.elementDrawer = new VenueElementDrawer(evaluator);
        this.tableDrawer = new VenueTableDrawer(evaluator);
        this.resources = resources;
        this.submission = submission;
        this.namespace = new HashMap<>(CanvasContext.build(live, config, submission));
        collectGroupLabels(config.blocks());
    }

    private void collectGroupLabels(List<SettingSheetConfigResponse.FormBlockResponse> blocks) {
        if (blocks == null) {
            return;
        }
        for (SettingSheetConfigResponse.FormBlockResponse block : blocks) {
            if ("REPEATABLE_GROUP".equals(block.type())) {
                groupLabels.put(block.id(), block.label());
            }
            collectGroupLabels(block.fields());
        }
    }

    public void render(VenueFormDocument document, PDDocument pdf, FontChain fontChain, RenderWarnings warnings)
            throws IOException {
        Map<UUID, PDImageXObject> images = new HashMap<>();
        PDImageXObject stageBase = null;
        List<VenuePage> pages = document.pages();
        for (int i = 0; i < pages.size(); i++) {
            VenuePage page = pages.get(i);
            int pageNumber = i + 1;
            PDRectangle size = new PDRectangle(page.widthMm() * PdfBox.PT_PER_MM, page.heightMm() * PdfBox.PT_PER_MM);
            PDPage pdPage = new PDPage(size);
            pdf.addPage(pdPage);
            try (PDPageContentStream stream = new PDPageContentStream(pdf, pdPage)) {
                drawBackground(stream, pdf, page.background(), size, images, warnings, pageNumber);
                for (VenueElement element : document.elements()) {
                    if (!page.id().equals(element.pageId())) {
                        continue;
                    }
                    if (element instanceof VenueElement.StagePlotElement && stageBase == null
                            && resources.stageBase() != null) {
                        stageBase = PDImageXObject.createFromByteArray(pdf, resources.stageBase().getContent(),
                                "stage-base");
                    }
                    drawElement(stream, fontChain, element, size.getHeight(), stageBase, warnings, pageNumber);
                }
            }
        }
        // 表の欄に 1 件ずつ並べたテキスト（items[N] を参照する式）も、書く欄として数える
        ItemReferences.coveredCounts(document).forEach((groupId, upTo) -> coverages.merge(groupId,
                new VenueTableDrawer.Coverage(TableRows.collectGroup(groupId, namespace).size(), upTo),
                (a, b) -> new VenueTableDrawer.Coverage(a.totalRows(), Math.max(a.coveredUpTo(), b.coveredUpTo()))));
        // 同じグループを複数の表に分けて書くこともあるので、全部の表を描き終えてから入りきらなかった分を数える
        coverages.forEach((groupId, coverage) -> {
            int overflow = coverage.totalRows() - coverage.coveredUpTo();
            if (overflow > 0) {
                warnings.addGeneral("書式に入りきらない回答が" + overflow + "件あります（グループ: " + groupLabel(groupId) + "）");
            }
        });
    }

    private String groupLabel(String groupId) {
        return groupLabels.getOrDefault(groupId, groupId);
    }

    private void drawElement(PDPageContentStream stream, FontChain fontChain, VenueElement element,
            float pageHeightPt, PDImageXObject stageBase, RenderWarnings warnings, int pageNumber)
            throws IOException {
        try {
            if (!conditions.passes(element.condition(), namespace)) {
                return;
            }
        } catch (CanvasException ex) {
            warnings.add(pageNumber, label(element) + "の表示条件を評価できません（" + ex.getMessage() + "）");
            return;
        }
        PdfBox box = PdfBox.fromTopLeftMm(element.xMm(), element.yMm(), element.wMm(), element.hMm(), pageHeightPt);
        stream.saveGraphicsState();
        try {
            switch (element) {
                case VenueElement.TextElement t -> elementDrawer.drawText(stream, fontChain, t, box, namespace,
                        message -> warnings.add(pageNumber, label(element) + "の式を評価できません（" + message + "）"));
                case VenueElement.FieldElement f -> {
                    if (!elementDrawer.drawField(stream, fontChain, f, box, namespace)) {
                        warnings.add(pageNumber, label(element) + "の項目がフォームにありません");
                    }
                }
                case VenueElement.IconElement icon -> elementDrawer.drawIcon(stream, icon, box);
                case VenueElement.ShapeElement shape -> elementDrawer.drawShape(stream, shape, box);
                case VenueElement.TableElement table -> {
                    VenueTableDrawer.Coverage coverage = tableDrawer.draw(stream, fontChain, table, box, namespace,
                            VenueElementDrawer.color(table.color()));
                    coverages.merge(table.groupId() == null ? "" : table.groupId(), coverage,
                            (a, b) -> new VenueTableDrawer.Coverage(a.totalRows(),
                                    Math.max(a.coveredUpTo(), b.coveredUpTo())));
                }
                case VenueElement.StagePlotElement plot -> drawStagePlot(stream, fontChain, plot, box, stageBase);
            }
        } catch (RuntimeException ex) {
            warnings.add(pageNumber, label(element) + "を描けませんでした（" + ex.getMessage() + "）");
        } finally {
            stream.restoreGraphicsState();
        }
    }

    private void drawStagePlot(PDPageContentStream stream, FontChain fontChain, VenueElement.StagePlotElement plot,
            PdfBox box, PDImageXObject stageBase) throws IOException {
        String raw = StagePlotAnswers.find(submission.answers(), plot.fieldId(), plot.groupId(), plot.itemIndex());
        StagePlotSettings settings = resources.stagePlot() != null ? resources.stagePlot() : StagePlotSettings.empty();
        StagePlotDrawer.draw(stream, fontChain, box, settings, StagePlotValues.parse(raw),
                "withBase".equals(plot.mode()), stageBase, plot.labelFontSizePt());
    }

    private void drawBackground(PDPageContentStream stream, PDDocument pdf, PageBackground background,
            PDRectangle pageSize, Map<UUID, PDImageXObject> images, RenderWarnings warnings, int pageNumber)
            throws IOException {
        if (background == null || background.assetId() == null) {
            return;
        }
        LiveAsset asset = resources.backgrounds().get(background.assetId());
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

    private static String label(VenueElement element) {
        String kind = switch (element) {
            case VenueElement.TextElement t -> "テキスト";
            case VenueElement.FieldElement f -> "項目";
            case VenueElement.TableElement t -> "表";
            case VenueElement.IconElement i -> "アイコン";
            case VenueElement.ShapeElement s -> "図形";
            case VenueElement.StagePlotElement p -> "配置図";
        };
        return kind + "（" + element.id() + "）";
    }

    @Override
    public void close() throws IOException {
        for (PDDocument source : openedSources.values()) {
            source.close();
        }
        openedSources.clear();
    }
}
