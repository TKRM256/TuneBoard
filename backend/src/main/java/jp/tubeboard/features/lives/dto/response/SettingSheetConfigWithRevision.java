package jp.tubeboard.features.lives.dto.response;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/** 管理画面に返すフォームの設定。保存のときに送り返してもらう版の印 {@code revision} を横に添える。 */
public record SettingSheetConfigWithRevision(
        @JsonUnwrapped SettingSheetConfigResponse config,
        String revision) {
}
