package jp.tubeboard.features.lives.service.export;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.export.context.CanvasContext;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.service.crud.ILivesService;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader.LiveInputs;
import lombok.RequiredArgsConstructor;

/** 式エディタのプレビュー用に、式を実際の提出データで評価する。 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ExpressionPreviewService {

    private final SubmissionExportLoader loader;
    private final ILivesService livesService;
    private final ExpressionEvaluator expressionEvaluator;

    public record Evaluation(String result, boolean error) {
    }

    public record PreviewRow(UUID submissionId, String recordLabel, String result, boolean error) {
    }

    public Evaluation previewOne(UUID liveId, UUID submissionId, Map<String, String> body) {
        SubmissionExportLoader.ExportInputs inputs = loader.loadOne(liveId, submissionId);
        return evaluate(inputs.live(), inputs.config(), inputs.submission(), body);
    }

    /**
     * 同じ式をライブの全提出に対して評価する。式が一部の提出だけで壊れていないかを
     * PDF を作らずに一覧で確認できるようにするためのもの。
     */
    public List<PreviewRow> previewAll(UUID liveId, Map<String, String> body) {
        LiveInputs live = loader.loadLive(liveId);
        return livesService.listOwnedSettingSheetSubmissionDetails(liveId).stream()
                .map(submission -> {
                    Evaluation evaluation = evaluate(live.liveResponse(), live.config(), submission, body);
                    return new PreviewRow(submission.id(), submission.recordLabel(), evaluation.result(),
                            evaluation.error());
                })
                .toList();
    }

    private Evaluation evaluate(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission, Map<String, String> body) {
        try {
            Map<String, Object> ns = new HashMap<>(CanvasContext.build(live, config, submission));
            bindSampleRow(ns, body.get("groupId"), body.get("fieldId"));
            // 失敗した式があればエラーとして返す（画面で赤く出せるように）。結果の文字には失敗箇所を [ ] で残す
            List<String> errors = new ArrayList<>();
            String template = body.getOrDefault("expression", "");
            expressionEvaluator.interpolate(template, ns, errors::add);
            return errors.isEmpty()
                    ? new Evaluation(expressionEvaluator.interpolate(template, ns), false)
                    : new Evaluation("[" + String.join(" / ", errors) + "]", true);
        } catch (Exception ex) {
            return new Evaluation("[評価エラー: " + ex.getMessage() + "]", true);
        }
    }

    /**
     * 繰り返し行やフィールド行の書式は描画時に {@code item} / {@code value} / {@code values}
     * が束縛されて評価される。プレビューでも同じ式を試せるよう、
     * 指定されたグループの 1 件目（グループ未指定なら該当フィールド）を見本として束縛する。
     */
    private void bindSampleRow(Map<String, Object> ns, String groupId, String fieldId) {
        if (groupId != null && !groupId.isBlank()
                && ns.get("groups") instanceof Map<?, ?> groups
                && groups.get(groupId) instanceof CanvasContext.GroupRef group
                && !group.getItems().isEmpty()) {
            CanvasContext.ItemRef item = group.getItems().get(0);
            ns.put("item", item);
            if (fieldId != null && !fieldId.isBlank()) {
                CanvasContext.FieldRef ref = item.field(fieldId);
                ns.put("value", ref.getValue());
                ns.put("values", ref.getValues());
            }
            return;
        }

        if (fieldId != null && !fieldId.isBlank()
                && ns.get("fields") instanceof Map<?, ?> fields
                && fields.get(fieldId) instanceof CanvasContext.FieldRef ref) {
            ns.put("value", ref.getValue());
            ns.put("values", ref.getValues());
        }
    }
}
