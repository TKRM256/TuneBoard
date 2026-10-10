package jp.tubeboard.features.lives.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record SettingSheetSubmissionResponse(
                UUID id,
                String recordLabel,
                String submissionStatus,
                LocalDateTime submittedAt,
                /** 提出内容が最後に更新された日時。新規提出直後は submittedAt と同じ。 */
                LocalDateTime updatedAt,
                Long version) {
}