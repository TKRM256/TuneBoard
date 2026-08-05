package jp.tubeboard.features.lives.pdf;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PdfCanvasMeasureResponse.TableMeasurement;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasContext;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.DefaultCanvasFactory;
import jp.tubeboard.features.lives.pdf.canvas.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.MeasuredTable;
import lombok.RequiredArgsConstructor;

/**
 * Reports the height each table of a layout needs for a given submission, so the
 * editor can resize a table to its content. The measurement runs through the same
 * {@link TableMeasurer} the renderer uses, so the answer matches the PDF exactly.
 */
@Service
@RequiredArgsConstructor
public class SettingSheetCanvasMeasurer {

    private final PdfFontLoader fontLoader;
    private final ExpressionEvaluator evaluator;
    private final DefaultCanvasFactory defaultCanvasFactory;

    public List<TableMeasurement> measureTables(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, CanvasDocument canvas) throws IOException {
        CanvasDocument doc = canvas != null && canvas.elements() != null
                ? canvas
                : defaultCanvasFactory.build(config);
        if (doc.elements() == null) {
            return List.of();
        }

        // Font metrics only exist relative to a document, so measuring needs one
        // even though nothing is drawn into it.
        try (PDDocument pdf = new PDDocument()) {
            FontChain fontChain = fontLoader.loadFontChain(pdf);
            Map<String, Object> namespace = CanvasContext.build(live, config, submission);
            TableMeasurer measurer = new TableMeasurer(evaluator);

            List<TableMeasurement> out = new ArrayList<>();
            for (CanvasElement element : doc.elements()) {
                if (element instanceof CanvasElement.TableElement table) {
                    float widthPt = (table.wMm() != null ? table.wMm() : 50f) * PdfLayoutEngine.MM_TO_PT;
                    MeasuredTable measured = measurer.measure(table, widthPt, fontChain, namespace);
                    if (!measured.isEmpty()) {
                        out.add(new TableMeasurement(table.id(),
                                measured.naturalHeightPt() / PdfLayoutEngine.MM_TO_PT));
                    }
                }
            }
            return out;
        }
    }
}
