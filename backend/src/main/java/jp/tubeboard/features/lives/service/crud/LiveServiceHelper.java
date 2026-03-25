package jp.tubeboard.features.lives.service.crud;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Component;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import lombok.AllArgsConstructor;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;

@Component
@AllArgsConstructor
public class LiveServiceHelper {
        private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
        private final TenantsRepository tenantsRepository;
        private final UserService userService;
        private final LiveRepository liveRepository;
        private final SettingSheetConfigService settingSheetConfigService;
        private final SettingSheetSubmissionService settingSheetSubmissionService;

        public Tenants findTenant(UUID tenantId, Long userId) {
                return tenantsRepository.findByIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
                                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));
        }

        public LiveStatus resolveStatus(LiveStatus status) {
                return status == null ? LiveStatus.DRAFT : status;
        }

        public Live findOwnedLive(UUID id) {
                User currentUser = userService.getCurrentUser();
                return liveRepository.findByIdAndTenantUserIdAndDeletedAtIsNull(id, currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));
        }

        public SettingSheetSubmission findPublicSubmission(String publicToken, UUID submissionId) {
                return settingSheetSubmissionRepository
                                .findByIdAndLivePublicTokenAndLiveDeletedAtIsNull(submissionId, publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
        }

        public SettingSheetSubmission findOwnedSubmission(UUID liveId, UUID submissionId) {
                User currentUser = userService.getCurrentUser();
                return settingSheetSubmissionRepository
                                .findByIdAndLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNull(submissionId, liveId,
                                                currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
        }

        public SettingSheetSubmissionResponse saveSubmission(Live live,
                        PublicSettingSheetSubmissionRequest request,
                        SettingSheetSubmission submission) {
                assertAcceptingPublicSubmission(live);
                PublicSettingSheetSubmissionRequest normalizedRequest = settingSheetSubmissionService
                                .normalizeSubmissionRequest(request);
                SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);
                settingSheetSubmissionService.validateSubmission(normalizedRequest, config);
                String summary = settingSheetSubmissionService.resolveSubmissionSummary(config, normalizedRequest,
                                live.getName());

                SettingSheetSubmission target = submission == null
                                ? SettingSheetSubmission.builder().live(live).build()
                                : submission;
                target.setRecordLabel(summary);
                target.setSubmissionStatus(SettingSheetConstants.SUBMISSION_STATUS);
                target.setPayloadJson(settingSheetSubmissionService.writeSubmissionPayload(normalizedRequest));

                return toSubmissionResponse(settingSheetSubmissionRepository.save(target));
        }

        public LiveResponse toResponse(Live live) {
                return new LiveResponse(
                                live.getId(),
                                live.getTenant().getId(),
                                live.getTenant().getName(),
                                live.getPublicToken(),
                                live.getName(),
                                live.getDate(),
                                live.getLocation(),
                                live.getDeadlineAt(),
                                live.getStatus());
        }

        public SettingSheetSubmissionResponse toSubmissionResponse(SettingSheetSubmission submission) {
                return new SettingSheetSubmissionResponse(
                                submission.getId(),
                                submission.getRecordLabel(),
                                submission.getSubmissionStatus(),
                                submission.getCreatedAt());
        }

        private void assertAcceptingPublicSubmission(Live live) {
                if (live.getStatus() != LiveStatus.PUBLISHED) {
                        throw new BadRequestException("このライブは現在回答を受け付けていません");
                }

                LocalDateTime deadlineAt = live.getDeadlineAt();
                if (deadlineAt != null && deadlineAt.isBefore(LocalDateTime.now())) {
                        throw new BadRequestException("回答受付は終了しました");
                }
        }
}
