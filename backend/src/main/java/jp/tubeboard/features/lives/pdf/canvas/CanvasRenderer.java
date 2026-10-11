package jp.tubeboard.features.lives.pdf.canvas;

import java.awt.Color;
import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.export.context.CanvasContext;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasPage;
import jp.tubeboard.features.lives.pdf.canvas.PageFlowPlanner.Placement;
import jp.tubeboard.features.lives.pdf.canvas.table.TableDrawer;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.pdf.draw.TextBoxDrawer;

/**
 * Renders a {@link CanvasDocument} using absolute mm coordinates. The schema's
 * coordinate origin is the top-left of the page; this class converts to PDFBox's
 * bottom-left origin.
 *
 * <p>{@link PageFlowPlanner} decides beforehand which page each element lands on,
 * so a table with more rows than its box can hold flows onto further pages
 * instead of spilling off the edge.
 */
public class CanvasRenderer {

    private static final float DEFAULT_FONT_SIZE = 10f;

    private final ExpressionEvaluator evaluator;
    private final Map<String, Object> namespace;
    private final PageFlowPlanner planner;
    private final TableDrawer tableDrawer = new TableDrawer();

    public CanvasRenderer(ExpressionEvaluator evaluator, LiveResponse live,
            SettingSheetConfigResponse config, PublicSettingSheetSubmissionDetailResponse submission) {
        this.evaluator = evaluator;
        this.namespace = CanvasContext.build(live, config, submission);
        this.planner = new PageFlowPlanner(new TableMeasurer(evaluator));
    }

    public void render(CanvasDocument document, PDDocument pdf, FontChain fontChain) throws IOException {
        PDRectangle pageBox = pageBoxOf(document.page());
        List<Placement> placements = planner.plan(document, pageBox, fontChain, namespace);
        int pageCount = 1;
        for (Placement placement : placements) {
            pageCount = Math.max(pageCount, placement.pageIndex() + 1);
        }

        float pageHeightPt = pageBox.getHeight();
        for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
            PDPage pdPage = new PDPage(pageBox);
            pdf.addPage(pdPage);
            try (PDPageContentStream stream = new PDPageContentStream(pdf, pdPage)) {
                for (Placement placement : placements) {
                    if (placement.pageIndex() == pageIndex) {
                        renderPlacement(placement, stream, fontChain, pageHeightPt);
                    }
                }
            }
        }
    }

    static PDRectangle pageBoxOf(CanvasPage page) {
        PdfPaperSize size = page != null && page.size() != null ? page.size() : PdfPaperSize.A4;
        PdfOrientation orientation = page != null && page.orientation() != null
                ? page.orientation()
                : PdfOrientation.LANDSCAPE;
        return size.rectangle(orientation);
    }

    private void renderPlacement(Placement placement, PDPageContentStream stream, FontChain fontChain,
            float pageHeightPt) throws IOException {
        float topY = pageHeightPt - placement.topPt();
        PdfBox box = new PdfBox(placement.leftPt(), topY - placement.heightPt(), topY,
                placement.widthPt(), placement.heightPt());
        CanvasElement element = placement.element();

        if (element instanceof CanvasElement.TextElement t) {
            renderText(t, stream, fontChain, box);
        } else if (element instanceof CanvasElement.FieldElement f) {
            renderField(f, stream, fontChain, box);
        } else if (element instanceof CanvasElement.DividerElement d) {
            renderDivider(d, stream, box);
        } else if (element instanceof CanvasElement.SpacerElement) {
            // Spacer is editor-only; nothing to draw.
        } else if (element instanceof CanvasElement.TableElement table) {
            tableDrawer.draw(stream, fontChain, table, placement.measured(), box.leftX(), box.topY(),
                    box.widthPt(), box.heightPt(), placement.rowFrom(), placement.rowTo(),
                    placement.drawHeader());
        }
    }

    // ─────────── Text / Field ───────────

    private void renderText(CanvasElement.TextElement t, PDPageContentStream stream, FontChain fontChain,
            PdfBox box) throws IOException {
        TextBoxDrawer.drawBackgroundAndBorder(stream, box, t.backgroundColor(), t.borderColor(), t.borderThicknessPt());
        String content = evaluator.interpolate(nullToEmpty(t.content()), namespace);
        float fs = nonNullOr(t.fontSizePt(), DEFAULT_FONT_SIZE);
        Color color = CanvasColors.parse(t.color(), Color.BLACK);
        TextBoxDrawer.drawTextBox(stream, fontChain, content, box, fs, t.align(), t.verticalAlign(), color,
                Boolean.TRUE.equals(t.bold()));
    }

    private void renderField(CanvasElement.FieldElement f, PDPageContentStream stream, FontChain fontChain,
            PdfBox box) throws IOException {
        TextBoxDrawer.drawBackgroundAndBorder(stream, box, f.backgroundColor(), f.borderColor(), f.borderThicknessPt());
        float fs = nonNullOr(f.fontSizePt(), DEFAULT_FONT_SIZE);
        Color color = CanvasColors.parse(f.color(), Color.BLACK);

        String value = lookupFieldValue(f.fieldId());
        String text;
        if (Boolean.TRUE.equals(f.showLabel())) {
            String label = !isBlank(f.labelOverride()) ? f.labelOverride()
                    : (!isBlank(f.fallbackLabel()) ? f.fallbackLabel() : f.fieldId());
            text = label + ": " + value;
        } else {
            text = value;
        }
        TextBoxDrawer.drawTextBox(stream, fontChain, text, box, fs, f.align(), f.verticalAlign(), color,
                Boolean.TRUE.equals(f.bold()));
    }

    private String lookupFieldValue(String fieldId) {
        if (isBlank(fieldId))
            return "";
        Object fields = namespace.get("fields");
        if (fields instanceof Map<?, ?> map) {
            Object ref = map.get(fieldId);
            if (ref instanceof CanvasContext.FieldRef fr)
                return fr.getValue();
        }
        return "";
    }

    // ─────────── Divider ───────────

    private void renderDivider(CanvasElement.DividerElement d, PDPageContentStream stream, PdfBox box)
            throws IOException {
        Color color = CanvasColors.parse(d.color(), new Color(0xd1, 0xd5, 0xdb));
        float thickness = nonNullOr(d.thicknessPt(), 0.6f);
        float midY = box.bottomY() + box.heightPt() / 2f;
        stream.setStrokingColor(color);
        stream.setLineWidth(thickness);
        stream.moveTo(box.leftX(), midY);
        stream.lineTo(box.leftX() + box.widthPt(), midY);
        stream.stroke();
    }

    // ─────────── Misc helpers ───────────

    private static float nonNullOr(Float v, float fallback) {
        return v != null ? v : fallback;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
