package jp.tubeboard.features.lives.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record SettingSheetSubmissionResponse(
                UUID id,
                String recordLabel,
                String submissionStatus,
                LocalDateTime submittedAt) {
}