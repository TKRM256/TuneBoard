package jp.tubeboard.features.lives.dto.response;

import java.time.LocalDate;
import java.util.UUID;

import jp.tubeboard.features.lives.model.LiveStatus;

/**
 * フォーム設定・PDFレイアウトのコピー元候補となるライブ。
 * 現在のユーザーがアクセスできる全テナントのライブが対象。
 */
public record LiveCopySourceResponse(
        UUID id,
        UUID tenantId,
        String tenantName,
        String name,
        LocalDate date,
        LiveStatus status,
        boolean hasSettingSheetConfig,
        boolean hasPdfCanvas) {
}
