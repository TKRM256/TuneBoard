package jp.tubeboard.features.lives.venueform.render;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.export.context.CanvasContext;
import jp.tubeboard.features.lives.export.context.CanvasException;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.pdf.canvas.table.TableDrawer;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;
import jp.tubeboard.features.lives.pdf.canvas.table.TableRows;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.stageplot.StagePlotAnswers;
import jp.tubeboard.features.lives.stageplot.StagePlotDrawer;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.stageplot.StagePlotValues;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;
import jp.tubeboard.features.lives.venueform.render.FlowPlanner.Placement;

/**
 * PDF 書式を 1 件の提出で描く。背景の上に要素を重ね、罫線つきの表が伸びたら続きのページを足す。
 * 背景の PDF は出力先を保存し終えるまで開いておく必要があるので、使い終わったら close する。
 */
public final class VenueFormRenderer implements AutoCloseable {

    /** 描画に使うファイル類。権限を確かめたうえで呼び出し側が集める。 */
    public record Resources(Map<UUID, LiveAsset> backgrounds, StagePlotSettings stagePlot, LiveAsset stageBase) {
    }

    private static final float DEFAULT_MARGIN_MM = 10f;

    private final ConditionEvaluator conditions;
    private final VenueElementDrawer elementDrawer;
    private final VenueTableDrawer tableDrawer;
    private final TableMeasurer gridMeasurer;
    private final TableDrawer gridDrawer = new TableDrawer();
    private final BackgroundDrawer backgroundDrawer;
    private final Resources resources;
    private final PublicSettingSheetSubmissionDetailResponse submission;
    private final Map<String, Object> namespace;
    private final Map<String, VenueTableDrawer.Coverage> coverages = new HashMap<>();
    private final FormLabels labels;
    private PDImageXObject stageBase;

    public VenueFormRenderer(ExpressionEvaluator evaluator, LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, Resources resources) {
        this.conditions = new ConditionEvaluator(evaluator);
        this.elementDrawer = new VenueElementDrawer(evaluator);
        this.tableDrawer = new VenueTableDrawer(evaluator);
        this.gridMeasurer = new TableMeasurer(evaluator);
        this.backgroundDrawer = new BackgroundDrawer(resources.backgrounds());
        this.resources = resources;
        this.submission = submission;
        this.namespace = new HashMap<>(CanvasContext.build(live, config, submission));
        this.labels = FormLabels.of(config.blocks());
    }

    public void render(VenueFormDocument document, PDDocument pdf, FontChain fontChain, RenderWarnings warnings)
            throws IOException {
        FlowPlanner planner = new FlowPlanner((grid, widthPt) -> gridMeasurer.measure(grid.toTable(), widthPt,
                fontChain, namespace));
        int pageNumber = 0;
        for (VenuePage page : document.pages()) {
            PDRectangle size = new PDRectangle(page.widthMm() * PdfBox.PT_PER_MM, page.heightMm() * PdfBox.PT_PER_MM);
            float marginPt = (page.marginMm() == null ? DEFAULT_MARGIN_MM : page.marginMm()) * PdfBox.PT_PER_MM;
            List<Placement> placements = planner.plan(visibleElements(document, page, warnings, pageNumber + 1),
                    size.getHeight(), marginPt);
            int pageCount = 1;
            for (Placement placement : placements) {
                pageCount = Math.max(pageCount, placement.pageOffset() + 1);
            }
            for (int offset = 0; offset < pageCount; offset++) {
                pageNumber++;
                PDPage pdPage = new PDPage(size);
                pdf.addPage(pdPage);
                try (PDPageContentStream stream = new PDPageContentStream(pdf, pdPage)) {
                    if (offset == 0) {
                        backgroundDrawer.draw(stream, pdf, page.background(), size, warnings, pageNumber);
                    }
                    for (Placement placement : placements) {
                        if (placement.pageOffset() == offset) {
                            drawPlacement(stream, pdf, fontChain, placement, size.getHeight(), warnings, pageNumber);
                        }
                    }
                }
            }
        }
        warnOverflow(document, warnings);
    }

    /** 表示条件を満たす要素だけを残す。条件が伸びる表の押し下げにも効くよう、配置の前に決める。 */
    private List<VenueElement> visibleElements(VenueFormDocument document, VenuePage page, RenderWarnings warnings,
            int pageNumber) {
        List<VenueElement> visible = new ArrayList<>();
        for (VenueElement element : document.elements()) {
            if (!page.id().equals(element.pageId())) {
                continue;
            }
            try {
                if (conditions.passes(element.condition(), namespace)) {
                    visible.add(element);
                }
            } catch (CanvasException ex) {
                warnings.add(pageNumber, label(element) + "の表示条件を評価できません（" + ex.getMessage() + "）");
            }
        }
        return visible;
    }

    private void warnOverflow(VenueFormDocument document, RenderWarnings warnings) {
        // 表の欄に 1 件ずつ並べたテキスト（items[N] を参照する式）も、書く欄として数える
        ItemReferences.coveredCounts(document).forEach((groupId, upTo) -> coverages.merge(groupId,
                new VenueTableDrawer.Coverage(TableRows.collectGroup(groupId, namespace).size(), upTo),
                VenueFormRenderer::wider));
        // 同じグループを複数の表に分けて書くこともあるので、全部の表を描き終えてから入りきらなかった分を数える
        coverages.forEach((groupId, coverage) -> {
            int overflow = coverage.totalRows() - coverage.coveredUpTo();
            if (overflow > 0) {
                warnings.addGeneral("書式に入りきらない回答が" + overflow + "件あります（グループ: "
                        + labels.group(groupId) + "）");
            }
        });
    }

    private void drawPlacement(PDPageContentStream stream, PDDocument pdf, FontChain fontChain, Placement placement,
            float pageHeightPt, RenderWarnings warnings, int pageNumber) throws IOException {
        VenueElement element = placement.element();
        PdfBox box = placement.box(pageHeightPt);
        stream.saveGraphicsState();
        try {
            switch (element) {
                case VenueElement.TextElement t -> elementDrawer.drawText(stream, fontChain, t, box, namespace,
                        message -> warnings.add(pageNumber, label(element) + "の式を評価できません（" + message + "）"));
                case VenueElement.FieldElement f -> {
                    if (!elementDrawer.drawField(stream, fontChain, f, box, namespace, labels.field(f.fieldId()))) {
                        warnings.add(pageNumber, label(element) + "の項目がフォームにありません");
                    }
                }
                case VenueElement.IconElement icon -> elementDrawer.drawIcon(stream, icon, box);
                case VenueElement.ShapeElement shape -> elementDrawer.drawShape(stream, shape, box);
                case VenueElement.TableElement table -> {
                    VenueTableDrawer.Coverage coverage = tableDrawer.draw(stream, fontChain, table, box, namespace,
                            VenueElementDrawer.color(table.color()));
                    coverages.merge(table.groupId() == null ? "" : table.groupId(), coverage,
                            VenueFormRenderer::wider);
                }
                case VenueElement.GridElement grid -> drawGrid(stream, fontChain, grid, placement, box);
                case VenueElement.StagePlotElement plot -> drawStagePlot(stream, pdf, fontChain, plot, box);
            }
        } catch (RuntimeException ex) {
            warnings.add(pageNumber, label(element) + "を描けませんでした（" + ex.getMessage() + "）");
        } finally {
            stream.restoreGraphicsState();
        }
    }

    private void drawGrid(PDPageContentStream stream, FontChain fontChain, VenueElement.GridElement grid,
            Placement placement, PdfBox box) throws IOException {
        gridDrawer.draw(stream, fontChain, grid.toTable(), placement.measured(), box.leftX(), box.topY(),
                box.widthPt(), box.heightPt(), placement.rowFrom(), placement.rowTo(), placement.drawHeader());
        if (grid.source() instanceof TableSource.GroupSource group
                && placement.measured() != null) {
            coverages.merge(group.groupId(),
                    new VenueTableDrawer.Coverage(placement.measured().rows().size(), placement.rowTo()),
                    VenueFormRenderer::wider);
        }
    }

    private void drawStagePlot(PDPageContentStream stream, PDDocument pdf, FontChain fontChain,
            VenueElement.StagePlotElement plot, PdfBox box) throws IOException {
        if (stageBase == null && resources.stageBase() != null) {
            stageBase = PDImageXObject.createFromByteArray(pdf, resources.stageBase().getContent(), "stage-base");
        }
        String raw = StagePlotAnswers.find(submission.answers(), plot.fieldId(), plot.groupId(), plot.itemIndex());
        StagePlotSettings settings = resources.stagePlot() != null ? resources.stagePlot() : StagePlotSettings.empty();
        StagePlotDrawer.draw(stream, fontChain, box, settings, StagePlotValues.parse(raw),
                "withBase".equals(plot.mode()), stageBase, plot.labelFontSizePt());
    }

    private static VenueTableDrawer.Coverage wider(VenueTableDrawer.Coverage a, VenueTableDrawer.Coverage b) {
        return new VenueTableDrawer.Coverage(Math.max(a.totalRows(), b.totalRows()),
                Math.max(a.coveredUpTo(), b.coveredUpTo()));
    }

    private static String label(VenueElement element) {
        String kind = switch (element) {
            case VenueElement.TextElement t -> "テキスト";
            case VenueElement.FieldElement f -> "項目";
            case VenueElement.TableElement t -> "欄に書く表";
            case VenueElement.GridElement g -> "表";
            case VenueElement.IconElement i -> "アイコン";
            case VenueElement.ShapeElement s -> "図形";
            case VenueElement.StagePlotElement p -> "配置図";
        };
        return kind + "（" + element.id() + "）";
    }

    @Override
    public void close() throws IOException {
        backgroundDrawer.close();
    }
}
