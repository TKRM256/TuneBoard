package jp.tubeboard.features.lives.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jp.tubeboard.features.lives.service.export.ExpressionPreviewService;
import jp.tubeboard.features.lives.service.export.ExpressionPreviewService.Evaluation;
import jp.tubeboard.features.lives.service.export.ExpressionPreviewService.PreviewRow;
import lombok.AllArgsConstructor;

/** 書式の式を提出の値で評価して見せる。 */
@RestController
@RequestMapping("/api/lives")
@AllArgsConstructor
public class ExpressionPreviewController {

    private final ExpressionPreviewService expressionPreviewService;

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
}
