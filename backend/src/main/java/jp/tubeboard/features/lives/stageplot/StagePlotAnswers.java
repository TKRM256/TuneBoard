package jp.tubeboard.features.lives.stageplot;

import java.util.List;

import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;

/** 提出の回答から配置図の値（JSON 文字列）を取り出す。 */
public final class StagePlotAnswers {

    private StagePlotAnswers() {
    }

    /**
     * @param groupId   グループ内の配置図ならそのグループ。トップレベルなら null か空
     * @param itemIndex グループの何件目か（1 始まり）
     * @return 値が無ければ null
     */
    public static String find(List<FieldAnswerResponse> answers, String fieldId, String groupId, Integer itemIndex) {
        if (answers == null || fieldId == null || fieldId.isBlank()) {
            return null;
        }
        if (groupId == null || groupId.isBlank()) {
            return firstValue(answers, fieldId);
        }
        FieldAnswerResponse group = answers.stream()
                .filter(answer -> groupId.equals(answer.fieldId()))
                .findFirst()
                .orElse(null);
        int index = (itemIndex == null ? 1 : itemIndex) - 1;
        if (group == null || group.items() == null || index < 0 || index >= group.items().size()) {
            return null;
        }
        GroupItemResponse item = group.items().get(index);
        return firstValue(item.answers(), fieldId);
    }

    private static String firstValue(List<FieldAnswerResponse> answers, String fieldId) {
        if (answers == null) {
            return null;
        }
        return answers.stream()
                .filter(answer -> fieldId.equals(answer.fieldId()))
                .filter(answer -> answer.values() != null && !answer.values().isEmpty())
                .map(answer -> answer.values().get(0))
                .findFirst()
                .orElse(null);
    }
}
