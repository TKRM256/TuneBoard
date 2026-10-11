package jp.tubeboard.features.lives.service.export;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.crud.ILivesService;
import jp.tubeboard.features.lives.service.crud.LiveServiceHelper;
import lombok.RequiredArgsConstructor;

/**
 * 出力（PDF・会場書式）に必要なライブ・フォーム設定・提出内容をまとめて読み込む。
 * ライブへのアクセス権の確認もここで行い、各出力処理で同じ手順を繰り返さないようにする。
 */
@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SubmissionExportLoader {

    private final LiveServiceHelper helper;
    private final SettingSheetConfigService settingSheetConfigService;
    private final ILivesService livesService;

    /** 出力対象のライブとフォーム設定。提出ごとの読み込みで使い回す。 */
    public record LiveInputs(Live live, LiveResponse liveResponse, SettingSheetConfigResponse config) {
    }

    public record ExportInputs(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission) {
    }

    public LiveInputs loadLive(UUID liveId) {
        Live live = helper.findOwnedLive(liveId);
        return new LiveInputs(live, helper.toResponse(live), settingSheetConfigService.readSettingSheetConfig(live));
    }

    public ExportInputs loadOne(UUID liveId, UUID submissionId) {
        LiveInputs live = loadLive(liveId);
        return toInputs(live, liveId, submissionId);
    }

    public List<ExportInputs> loadMany(UUID liveId, List<UUID> submissionIds) {
        LiveInputs live = loadLive(liveId);
        return submissionIds.stream().map(id -> toInputs(live, liveId, id)).toList();
    }

    private ExportInputs toInputs(LiveInputs live, UUID liveId, UUID submissionId) {
        return new ExportInputs(live.liveResponse(), live.config(),
                livesService.getOwnedSettingSheetSubmission(liveId, submissionId));
    }
}
