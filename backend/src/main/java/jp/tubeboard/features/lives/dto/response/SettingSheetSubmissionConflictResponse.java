package jp.tubeboard.features.lives.dto.response;

/**
 * 409 Conflict のレスポンスボディ。
 * ApiErrorResponse と同じ status/error/message に加えて、
 * クライアントが 3-way マージを行うための最新の提出内容を持つ。
 */
public record SettingSheetSubmissionConflictResponse(
                int status,
                String error,
                String message,
                PublicSettingSheetSubmissionDetailResponse latest) {
}
