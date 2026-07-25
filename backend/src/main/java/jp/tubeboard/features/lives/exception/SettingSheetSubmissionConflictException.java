package jp.tubeboard.features.lives.exception;

import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;

/**
 * 公開フォームの提出済みシートを更新しようとしたが、
 * 読み込み時点より新しい版がサーバに存在する場合に投げる。
 * クライアントがマージ画面を出せるよう、最新の提出内容を添えて返す。
 */
public class SettingSheetSubmissionConflictException extends RuntimeException {

    private final transient PublicSettingSheetSubmissionDetailResponse latest;

    public SettingSheetSubmissionConflictException(String message,
            PublicSettingSheetSubmissionDetailResponse latest) {
        super(message);
        this.latest = latest;
    }

    public PublicSettingSheetSubmissionDetailResponse latest() {
        return latest;
    }
}
