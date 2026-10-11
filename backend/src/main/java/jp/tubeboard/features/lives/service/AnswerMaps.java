package jp.tubeboard.features.lives.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;

/** 回答とブロックを ID で引けるようにする小さな関数群。 */
public final class AnswerMaps {

    private AnswerMaps() {
    }

    /** セクションの中のブロックも同じ階層として並べる（回答もセクションを挟まずに並ぶため）。 */
    public static Map<String, FormBlockResponse> toBlockMap(List<FormBlockResponse> blocks) {
        Map<String, FormBlockResponse> blockMap = new LinkedHashMap<>();
        for (FormBlockResponse block : blocks) {
            blockMap.put(block.id(), block);
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                blockMap.putAll(toBlockMap(block.fields()));
            }
        }
        return blockMap;
    }

    public static Map<String, FieldAnswerRequest> toAnswerMap(List<FieldAnswerRequest> answers) {
        Map<String, FieldAnswerRequest> answerMap = new LinkedHashMap<>();
        for (FieldAnswerRequest answer : answers) {
            if (!answer.fieldId().isBlank()) {
                answerMap.put(answer.fieldId(), answer);
            }
        }
        return answerMap;
    }

    public static FieldAnswerRequest emptyAnswer(String fieldId) {
        return new FieldAnswerRequest(fieldId, List.of(), List.of());
    }
}
