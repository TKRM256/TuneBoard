package jp.tubeboard.features.lives.service.crud;

import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;

public interface ILivesService {

        LiveResponse create(LiveCreateRequest request);

        List<LiveResponse> list();

        List<LiveResponse> listByTenant(UUID tenantId);

        LiveResponse get(UUID id);

        LiveResponse update(LiveUpdateRequest request);

        void delete(UUID id);

        PublicLiveResponse findPublicLive(String publicToken);

        SettingSheetConfigResponse getDefaultSettingSheetConfig();

        SettingSheetConfigResponse getSettingSheetConfig(UUID id);

        SettingSheetConfigResponse updateSettingSheetConfig(UUID id, SettingSheetConfigUpdateRequest request);

        SettingSheetSubmissionResponse submitPublicSettingSheet(String publicToken,
                        PublicSettingSheetSubmissionRequest request);

        List<SettingSheetSubmissionResponse> listOwnedSettingSheetSubmissions(UUID liveId);

        List<PublicSettingSheetSubmissionDetailResponse> listOwnedSettingSheetSubmissionDetails(UUID liveId);

        PublicSettingSheetSubmissionDetailResponse getOwnedSettingSheetSubmission(UUID liveId, UUID submissionId);

        PublicSettingSheetSubmissionDetailResponse getPublicSettingSheetSubmission(String publicToken,
                        UUID submissionId);

        PublicSettingSheetSubmissionDetailResponse getPublicSharedSettingSheetSubmission(String publicToken,
                        UUID submissionId);

        List<PublicSettingSheetSubmissionDetailResponse> listPublicSharedSettingSheetSubmissions(String publicToken);

        SettingSheetSubmissionResponse updatePublicSettingSheetSubmission(String publicToken,
                        UUID submissionId,
                        PublicSettingSheetSubmissionRequest request);
}