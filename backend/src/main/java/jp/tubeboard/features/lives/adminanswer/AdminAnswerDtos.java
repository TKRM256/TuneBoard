package jp.tubeboard.features.lives.adminanswer;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;

/** 管理者入力 API の入出力。 */
public final class AdminAnswerDtos {

    private AdminAnswerDtos() {
    }

    /** 送った項目だけを置き換える。値が空の項目は削除する。 */
    public record AdminAnswersUpdateRequest(@NotNull @Size(max = 100) List<FieldAnswerRequest> answers) {
    }

    public record AdminAnswersResponse(List<FieldAnswerResponse> answers) {
    }
}
