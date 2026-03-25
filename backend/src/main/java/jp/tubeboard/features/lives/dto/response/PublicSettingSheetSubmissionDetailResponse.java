package jp.tubeboard.features.lives.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PublicSettingSheetSubmissionDetailResponse(
                UUID id,
                String recordLabel,
                String submissionStatus,
                LocalDateTime submittedAt,
                List<FieldAnswerResponse> answers) {

        public record FieldAnswerResponse(
                        String fieldId,
                        List<String> values,
                        List<GroupItemResponse> items) {
        }

        public record GroupItemResponse(
                        List<FieldAnswerResponse> answers) {
        }
}