package jp.tubeboard.features.lives.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.lives.dto.request.PdfCanvasMeasureRequest;
import jp.tubeboard.features.lives.dto.request.PdfCanvasUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PdfGenerateRequest;
import jp.tubeboard.features.lives.dto.request.SubmissionsZipRequest;
import jp.tubeboard.features.lives.dto.response.PdfCanvasMeasureResponse;
import jp.tubeboard.features.lives.dto.response.PdfCanvasResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.service.export.ExpressionPreviewService;
import jp.tubeboard.features.lives.service.export.ExpressionPreviewService.Evaluation;
import jp.tubeboard.features.lives.service.export.ExpressionPreviewService.PreviewRow;
import jp.tubeboard.features.lives.service.pdf.SubmissionPdfExportService;
import lombok.AllArgsConstructor;

/** 自由レイアウト PDF のレイアウト保存・出力と、式のプレビュー。 */
@RestController
@RequestMapping("/api/lives")
@AllArgsConstructor
public class LivePdfController {

    private final SubmissionPdfExportService pdfExportService;
    private final ExpressionPreviewService expressionPreviewService;

    @GetMapping("/{id}/pdf-canvas")
    public ResponseEntity<PdfCanvasResponse> getPdfCanvas(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(pdfExportService.getPdfCanvas(id));
    }

    @PostMapping("/{id}/pdf-canvas")
    public ResponseEntity<PdfCanvasResponse> updatePdfCanvas(
            @PathVariable(name = "id") UUID id,
            @RequestBody @Valid PdfCanvasUpdateRequest request) {
        return ResponseEntity.ok(pdfExportService.updatePdfCanvas(id, request));
    }

    @PostMapping("/{id}/pdf-canvas/measure")
    public ResponseEntity<PdfCanvasMeasureResponse> measurePdfCanvas(
            @PathVariable(name = "id") UUID id,
            @RequestBody @Valid PdfCanvasMeasureRequest request) {
        return ResponseEntity.ok(pdfExportService.measurePdfCanvas(id, request));
    }

    @PostMapping("/{id}/setting-sheet/submissions/{submissionId}/preview-expression")
    public ResponseEntity<Map<String, String>> previewExpression(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId,
            @RequestBody Map<String, String> body) {
        try {
            Evaluation evaluation = expressionPreviewService.previewOne(id, submissionId, body);
            return evaluation.error()
                    ? ResponseEntity.ok(Map.of("result", evaluation.result(), "error", "true"))
                    : ResponseEntity.ok(Map.of("result", evaluation.result()));
        } catch (Exception ex) {
            return ResponseEntity.ok(Map.of("result", "[評価エラー: " + ex.getMessage() + "]", "error", "true"));
        }
    }

    @PostMapping("/{id}/setting-sheet/preview-expression")
    public ResponseEntity<List<PreviewRow>> previewExpressionForAllSubmissions(
            @PathVariable(name = "id") UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(expressionPreviewService.previewAll(id, body));
    }

    @PostMapping("/{id}/setting-sheet/submissions/{submissionId}/pdf")
    public ResponseEntity<byte[]> downloadSubmissionPdf(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId,
            @RequestBody(required = false) PdfGenerateRequest request) {
        CanvasDocument canvas = request != null ? request.canvas() : null;
        return ExportDownloads.attachment(pdfExportService.generateSubmissionPdf(id, submissionId, canvas),
                "pdf", MediaType.APPLICATION_PDF);
    }

    @PostMapping("/{id}/setting-sheet/submissions/pdf-zip")
    public ResponseEntity<byte[]> downloadSubmissionsZip(
            @PathVariable(name = "id") UUID id,
            @RequestBody @Valid SubmissionsZipRequest request) {
        return ExportDownloads.attachment(
                pdfExportService.generateSubmissionsZip(id, request.submissionIds(), request.canvas()),
                "zip", ExportDownloads.ZIP);
    }
}
